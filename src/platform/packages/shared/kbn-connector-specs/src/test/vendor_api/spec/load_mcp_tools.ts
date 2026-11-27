/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { McpTool } from '@kbn/connector-emulate';
import { isJsonObject } from '../json_pointer';
import { mapConcurrently } from './map_concurrently';
import { parseSpecText } from './parse_spec_text';

// Tool definitions are small; a few at a time keeps a server with many tools quick.
const CONCURRENCY = 8;

/** Whether a document describes one MCP tool, as `tools/list` and per-tool documents both hold. */
export const isMcpToolDefinition = (tool: unknown): boolean =>
  isJsonObject(tool) && typeof tool.name === 'string' && isJsonObject(tool.inputSchema);

/** One tool of a server that publishes a document per tool, rather than a `tools/list` result. */
export const readMcpTool = (text: string, source: string): McpTool => {
  const parsed = parseSpecText(text);
  if (!isMcpToolDefinition(parsed)) {
    throw new Error(`"${source}" is not an MCP tool definition: { name, inputSchema }`);
  }
  return parsed as unknown as McpTool;
};

export interface LoadMcpToolsOptions {
  /** The document the tool definitions are published under, which they resolve against. */
  readonly url: string;
  /** The tool documents to fetch, as URLs absolute or relative to `url`. */
  readonly tools: readonly string[];
  readonly fetchText: (url: string) => Promise<string>;
}

/**
 * Reads the tools of an MCP server that publishes one document per tool instead of a `tools/list`
 * result, so a server whose own `tools/list` needs a session or credentials can still be pinned
 * from what its vendor publishes. Every listed document must be fetched: a tool the vendor no
 * longer publishes fails the source rather than leaving the snapshot quietly short of it.
 */
export const loadMcpTools = async ({
  url,
  tools,
  fetchText,
}: LoadMcpToolsOptions): Promise<McpTool[]> => {
  const documents = tools.map((tool) => ({ tool, href: new URL(tool, url).href }));
  const loaded = await mapConcurrently(
    documents,
    async ({ tool, href }) => {
      let text: string;
      try {
        text = await fetchText(href);
      } catch (error) {
        // The error alone often says only "404 Not Found"; name the document, so the manifest
        // entry to fix is clear.
        throw new Error(
          `Couldn't fetch the tool document "${tool}" at ${href}: ${
            error instanceof Error ? error.message : String(error)
          }`
        );
      }
      return readMcpTool(text, tool);
    },
    CONCURRENCY
  );
  const byName = new Map<string, string>();
  for (const [index, { name }] of loaded.entries()) {
    const seen = byName.get(name);
    if (seen !== undefined) {
      throw new Error(`"${seen}" and "${documents[index].tool}" both define the tool "${name}"`);
    }
    byName.set(name, documents[index].tool);
  }
  return loaded;
};
