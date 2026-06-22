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
import { readRawInput, runWithConcurrency } from './shared'

interface SearchItem {
  header?: Record<string, unknown>
  body: Record<string, unknown>
}

interface MsearchResponse {
  responses?: JsonValue[]
}

/** Dependencies injectable for testing. */
export interface MsearchDeps {
  getTransport: () => Transport
}

const defaultDeps: MsearchDeps = { getTransport }

const inputSchema = z.object({
  index: z.string().optional().describe('Default index for searches'),
  query_file: z.string().optional().describe('Path to JSON file with search array'),
  batch_size: z.number().default(5).describe('Searches per _msearch request'),
  concurrency: z.number().default(5).describe('Parallel _msearch requests'),
})

/** Builds the NDJSON body for _msearch: alternating header/body lines. */
function buildMsearchNdjsonBody (items: SearchItem[], defaultIndex?: string | undefined): string {
  const lines: string[] = []
  for (const item of items) {
    const header = { ...item.header }
    if (header.index == null && defaultIndex != null) {
      header.index = defaultIndex
    }
    lines.push(JSON.stringify(header))
    lines.push(JSON.stringify(item.body))
  }
  return lines.join('\n') + '\n'
}

/** Parses raw input into an array of search items. */
function parseSearchItems (raw: string): SearchItem[] {
  const parsed = JSON.parse(raw)
  if (!Array.isArray(parsed)) {
    throw new Error('Expected a JSON array of search objects')
  }
  return parsed.map((item: unknown, i: number) => {
    if (item == null || typeof item !== 'object') {
      throw new Error(`Search item at index ${i} must be an object`)
    }
    const obj = item as Record<string, unknown>
    if (obj.body == null || typeof obj.body !== 'object') {
      throw new Error(`Search item at index ${i} must have a "body" object`)
    }
    return {
      header: (obj.header as Record<string, unknown> | undefined) ?? {},
      body: obj.body as Record<string, unknown>
    }
  })
}

function createMsearchHandler (deps: MsearchDeps = defaultDeps) {
  return async (parsed: { input?: z.infer<typeof inputSchema>; options: Record<string, string | number | boolean> }): Promise<JsonValue> => {
    const { index, query_file, batch_size, concurrency } = parsed.input!

    let transport: Transport
    try {
      transport = deps.getTransport()
    } catch (err) {
      return missingConfigError(err)
    }

    // Read and parse input
    let items: SearchItem[]
    try {
      let raw: string | undefined
      if (query_file != null) {
        raw = readRawInput(query_file)
      } else if (!process.stdin.isTTY) {
        raw = readRawInput()
      }
      if (raw == null || raw.trim().length === 0) {
        return {
          error: {
            code: 'input_error',
            message: 'No input provided. Use --query-file or pipe data to stdin'
          }
        }
      }
      items = parseSearchItems(raw)
    } catch (err) {
      return {
        error: {
          code: 'input_error',
          message: err instanceof Error ? err.message : String(err)
        }
      }
    }

    if (items.length === 0) {
      return { responses: [] }
    }

    // Split into batches
    const batches: SearchItem[][] = []
    for (let i = 0; i < items.length; i += batch_size) {
      batches.push(items.slice(i, i + batch_size))
    }

    // Build path
    const path = index != null
      ? `/${encodeURIComponent(index)}/_msearch`
      : '/_msearch'

    try {
      const allResponses: JsonValue[] = []

      await runWithConcurrency(batches, concurrency, async (batch) => {
        const ndjsonBody = buildMsearchNdjsonBody(batch, index)
        const result = await transport.request<MsearchResponse>(
          { method: 'POST', path, body: ndjsonBody },
          { headers: { 'content-type': 'application/x-ndjson' } }
        )
        if (result.responses != null) {
          allResponses.push(...result.responses)
        }
        return result
      })

      return { responses: allResponses }
    } catch (err) {
      return transportError(err)
    }
  }
}

export function createMsearchCommand (deps?: MsearchDeps): OpaqueCommandHandle {
  return defineCommand({
    name: 'msearch',
    description: 'Batch multiple search requests via _msearch with configurable batch size and concurrency.',
    input: inputSchema,
    handler: createMsearchHandler(deps)
  })
}
