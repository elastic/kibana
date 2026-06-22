/*
 * Copyright Elasticsearch B.V. and contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { z } from '@kbn/zod/v4'
import type { Transport } from '@elastic/transport'
import { defineCommand } from '../../factory'
import type { OpaqueCommandHandle, JsonValue } from '../../factory'
import { getTransport } from '../../lib/transport'
import { missingConfigError, transportError } from '../errors'
import { readRawInput } from './shared'

interface SearchHit {
  _source?: unknown
  _id?: string
}

interface SearchResponse {
  _scroll_id?: string
  hits?: {
    hits?: SearchHit[]
    total?: { value?: number } | number
  }
}

/** Dependencies injectable for testing. */
export interface ScrollSearchDeps {
  getTransport: () => Transport
  stdout: { write: (chunk: string) => boolean }
  stderr: { write: (chunk: string) => boolean }
  env?: NodeJS.ProcessEnv
}

const defaultDeps: ScrollSearchDeps = {
  getTransport,
  stdout: process.stdout,
  stderr: process.stderr,
  env: process.env,
}

const inputSchema = z.object({
  index: z.string().describe('Target index'),
  query: z.string().optional().describe('Query DSL clause as JSON (wrapped under "query"), e.g. \'{"match_all":{}}\''),
  query_file: z.string().optional().describe('Path to a file containing the full search body JSON (may include query, sort, aggs, ...)'),
  scroll: z.string().default('1m').describe('Scroll keep-alive duration'),
  size: z.number().default(1000).describe('Documents per scroll batch'),
  max_docs: z.number().optional().describe('Maximum total documents to fetch (default: unlimited)'),
})

function createScrollSearchHandler (deps: ScrollSearchDeps = defaultDeps) {
  return async (parsed: { input?: z.infer<typeof inputSchema>; options: Record<string, string | number | boolean> }): Promise<JsonValue> => {
    const { index, query, query_file, scroll, size, max_docs } = parsed.input!
    const maxDocs = max_docs ?? Infinity

    let transport: Transport
    try {
      transport = deps.getTransport()
    } catch (err) {
      return missingConfigError(err)
    }

    // Build the search request body:
    //   --query      → a Query DSL clause, wrapped as { query: <parsed> }
    //   --query-file → a full search body (may contain query, sort, aggs, ...)
    let queryBody: Record<string, unknown> = {}
    try {
      if (query != null) {
        const parsed = JSON.parse(query) as Record<string, unknown>
        queryBody = { query: parsed }
      } else if (query_file != null) {
        const raw = readRawInput(query_file)
        if (raw != null && raw.trim().length > 0) {
          queryBody = JSON.parse(raw) as Record<string, unknown>
        }
      }
    } catch (err) {
      return {
        error: {
          code: 'input_error',
          message: `Failed to parse query: ${err instanceof Error ? err.message : String(err)}`
        }
      }
    }

    const jsonMode = parsed.options['json'] === true
    const documents: JsonValue[] = []
    const startTime = Date.now()
    let scrollId: string | undefined
    let totalDocs = 0

    if (jsonMode && maxDocs === Infinity && deps.env?.['ELASTIC_NO_WARN'] !== '1') {
      deps.stderr.write('Warning: --json buffers all documents in memory. Set --max-docs <n> to limit.\n')
    }

    try {
      // Initial search with scroll
      const encodedIndex = encodeURIComponent(index)
      const initialResult = await transport.request<SearchResponse>(
        {
          method: 'POST',
          path: `/${encodedIndex}/_search`,
          querystring: { scroll, size },
          body: queryBody
        }
      )

      scrollId = initialResult._scroll_id
      let hits = initialResult.hits?.hits ?? []

      // Process pages
      while (hits.length > 0 && totalDocs < maxDocs) {
        for (const hit of hits) {
          if (totalDocs >= maxDocs) break
          if (jsonMode) {
            // _source is user-defined JSON — always a valid JsonValue at runtime
            documents.push(hit._source as JsonValue)
          } else {
            deps.stdout.write(JSON.stringify(hit._source) + '\n')
          }
          totalDocs++
        }

        if (totalDocs >= maxDocs || scrollId == null) break

        // Fetch next page
        const scrollResult = await transport.request<SearchResponse>({
          method: 'POST',
          path: '/_search/scroll',
          body: { scroll, scroll_id: scrollId }
        })

        scrollId = scrollResult._scroll_id
        hits = scrollResult.hits?.hits ?? []
      }
    } catch (err) {
      return transportError(err)
    } finally {
      // Always clean up the scroll context
      if (scrollId != null) {
        try {
          await transport.request({
            method: 'DELETE',
            path: '/_search/scroll',
            body: { scroll_id: scrollId }
          })
        } catch {
          // Best-effort cleanup — scroll will expire naturally
        }
      }
    }

    const elapsed_ms = Date.now() - startTime
    deps.stderr.write(`Fetched ${totalDocs} documents in ${elapsed_ms}ms\n`)

    if (jsonMode) {
      return { documents, total_docs: totalDocs, elapsed_ms }
    }
    return { total_docs: totalDocs, elapsed_ms }
  }
}

export function createScrollSearchCommand (deps?: ScrollSearchDeps): OpaqueCommandHandle {
  return defineCommand({
    name: 'scroll-search',
    description: 'Scroll through all search results, streaming documents as NDJSON to stdout, or returning a single JSON object when --json is set.',
    input: inputSchema,
    handler: createScrollSearchHandler(deps),
    formatOutput: () => ''
  })
}
