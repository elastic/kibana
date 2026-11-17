/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { loadMcpTools, readMcpTool } from './load_mcp_tools';

const BASE = 'https://raw.example.com/vendor/mcp-server/main/toolsnaps/';

const toolDocument = (name: string) => ({
  name,
  description: `Does ${name}`,
  inputSchema: { type: 'object', properties: { id: { type: 'string' } } },
  annotations: { readOnlyHint: true, title: name },
});

const fetchFrom =
  (documents: Readonly<Record<string, unknown>>) =>
  async (url: string): Promise<string> => {
    const document = documents[url];
    if (document === undefined) {
      throw new Error(`404 Not Found`);
    }
    return typeof document === 'string' ? document : JSON.stringify(document);
  };

describe('readMcpTool', () => {
  it('reads a tool definition', () => {
    expect(readMcpTool(JSON.stringify(toolDocument('get_me')), 'get_me.json').name).toBe('get_me');
  });

  it('names the document that holds something else', () => {
    expect(() => readMcpTool(JSON.stringify({ name: 'no schema' }), 'get_me.json')).toThrow(
      '"get_me.json" is not an MCP tool definition: { name, inputSchema }'
    );
  });
});

describe('loadMcpTools', () => {
  it('assembles the tools from a document each, resolved against the source URL', async () => {
    const fetchText = jest.fn(
      fetchFrom({
        [`${BASE}get_me.json`]: toolDocument('get_me'),
        'https://raw.example.com/other/search_code.json': toolDocument('search_code'),
      })
    );

    const tools = await loadMcpTools({
      url: BASE,
      tools: ['get_me.json', 'https://raw.example.com/other/search_code.json'],
      fetchText,
    });

    // The tools keep the order they are listed in, so the snapshot of a source doesn't churn.
    expect(tools.map(({ name }) => name)).toEqual(['get_me', 'search_code']);
    expect(fetchText).toHaveBeenCalledWith(`${BASE}get_me.json`);
    expect(fetchText).toHaveBeenCalledWith('https://raw.example.com/other/search_code.json');
  });

  it('fails on a tool the vendor no longer publishes, rather than shrinking the source', async () => {
    const fetchText = fetchFrom({ [`${BASE}get_me.json`]: toolDocument('get_me') });

    await expect(
      loadMcpTools({ url: BASE, tools: ['get_me.json', 'renamed.json'], fetchText })
    ).rejects.toThrow('404 Not Found');
  });

  it('fails when two documents define the same tool', async () => {
    const fetchText = fetchFrom({
      [`${BASE}get_me.json`]: toolDocument('get_me'),
      [`${BASE}get_me_v2.json`]: toolDocument('get_me'),
    });

    await expect(
      loadMcpTools({ url: BASE, tools: ['get_me.json', 'get_me_v2.json'], fetchText })
    ).rejects.toThrow('"get_me.json" and "get_me_v2.json" both define the tool "get_me"');
  });
});
