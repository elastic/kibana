/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { loadMarkdownReference } from './load_markdown_reference';

const INDEX_URL = 'https://docs.example.com/api/llms.txt';

const page = (title: string, endpoint: string) =>
  [`# ${title}`, '', `\`${endpoint}\``, '', '## Response', '', '```json', '{}', '```'].join('\n');

const documents: Record<string, string> = {
  [INDEX_URL]: [
    '# Example API',
    '',
    '- [List jobs](https://docs.example.com/api/workspace/jobs/list.md)',
    '- [Get job](workspace/jobs/get.md)',
    '- [List clusters](https://docs.example.com/api/workspace/clusters/list.md)',
    '- [Elsewhere](https://other.example.com/api/workspace/jobs/evil.md)',
  ].join('\n'),
  'https://docs.example.com/api/workspace/jobs/list.md': page(
    'List jobs',
    'GET /api/2.1/jobs/list'
  ),
  'https://docs.example.com/api/workspace/jobs/get.md': page('Get job', 'GET /api/2.1/jobs/get'),
  'https://docs.example.com/api/workspace/clusters/list.md': page(
    'List clusters',
    'GET /api/2.0/clusters/list'
  ),
};

describe('loadMarkdownReference', () => {
  let fetched: string[];
  const fetchText = async (url: string) => {
    fetched.push(url);
    if (!(url in documents)) {
      throw new Error(`404 ${url}`);
    }
    return documents[url];
  };

  beforeEach(() => {
    fetched = [];
  });

  it('fetches only the pages under the given prefixes, and converts them to OpenAPI', async () => {
    const document = await loadMarkdownReference({
      format: 'databricks-markdown',
      url: INDEX_URL,
      pages: ['workspace/jobs/'],
      fetchText,
    });

    expect(fetched.sort()).toEqual([
      INDEX_URL,
      'https://docs.example.com/api/workspace/jobs/get.md',
      'https://docs.example.com/api/workspace/jobs/list.md',
    ]);
    expect(Object.keys(document.paths ?? {}).sort()).toEqual([
      '/api/2.1/jobs/get',
      '/api/2.1/jobs/list',
    ]);
  });

  it('takes absolute prefixes too', async () => {
    const document = await loadMarkdownReference({
      format: 'databricks-markdown',
      url: INDEX_URL,
      pages: ['https://docs.example.com/api/workspace/clusters/'],
      fetchText,
    });

    expect(Object.keys(document.paths ?? {})).toEqual(['/api/2.0/clusters/list']);
  });

  it('fetches every page on the index origin without prefixes', async () => {
    const document = await loadMarkdownReference({
      format: 'databricks-markdown',
      url: INDEX_URL,
      fetchText,
    });

    expect(fetched).not.toContain('https://other.example.com/api/workspace/jobs/evil.md');
    expect(Object.keys(document.paths ?? {})).toHaveLength(3);
  });

  it('fails when a prefix selects no page, naming it', async () => {
    await expect(
      loadMarkdownReference({
        format: 'databricks-markdown',
        url: INDEX_URL,
        pages: ['workspace/jobs/', 'workspace/warehouses/'],
        fetchText,
      })
    ).rejects.toThrow(`${INDEX_URL} links to no page under "workspace/warehouses/"`);
    expect(fetched).toEqual([INDEX_URL]);
  });

  it('fails when the index links to no page', async () => {
    documents['https://docs.example.com/empty/llms.txt'] = '# Nothing here';

    await expect(
      loadMarkdownReference({
        format: 'brave-markdown',
        url: 'https://docs.example.com/empty/llms.txt',
        fetchText,
      })
    ).rejects.toThrow('links to no Markdown page');
  });
});
