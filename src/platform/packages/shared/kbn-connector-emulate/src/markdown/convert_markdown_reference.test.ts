/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { createEmulatorFetch } from '../fetch/create_emulator_fetch';
import { convertMarkdownReference, isMarkdownReferenceFormat, readLlmsIndex } from '.';

const listClusters = [
  '# List clusters',
  '',
  '`GET /api/2.1/clusters/{workspace_id}/list`',
  '',
  '## Query parameters',
  '',
  '- `page_size` (int32, optional)',
  '  Constraints: `[ 1 .. 100 ]`',
  '- `state` (string, optional)',
  '  Possible values:',
  '  - `RUNNING`',
  '  - `TERMINATED`',
  '',
  '## Returns',
  '',
  'Returns a list of ClusterInfo objects.',
  '',
  '## Response',
  '',
  '```json',
  '{ "clusters": [{ "cluster_id": "1234-567890-reef123" }] }',
  '```',
].join('\n');

describe('convertMarkdownReference', () => {
  const document = convertMarkdownReference({
    format: 'databricks-markdown',
    pages: [
      {
        url: 'https://docs.databricks.com/api/clusters/v2/list-clusters.md',
        markdown: listClusters,
      },
    ],
  });

  it('serves the converted operations from the emulator, checking requests against them', async () => {
    const { fetch, calls } = createEmulatorFetch({ specs: [document] });
    const headers = { authorization: 'Bearer token' };

    const listed = await fetch(
      'https://adb-123.azuredatabricks.net/api/2.1/clusters/1/list?page_size=10&state=RUNNING',
      { headers }
    );
    const invalid = await fetch(
      'https://adb-123.azuredatabricks.net/api/2.1/clusters/1/list?page_size=500&state=PENDING',
      { headers }
    );

    // A response the page gives only as an example is served as is.
    expect(await listed.json()).toEqual({ clusters: [{ cluster_id: '1234-567890-reef123' }] });
    expect(invalid.status).toBe(422);
    expect(calls[1].requestViolations.map(({ path }) => path.join('.'))).toEqual([
      'query.page_size',
      'query.state',
    ]);
  });

  it('adds path parameters the page leaves out', () => {
    expect(
      (document.paths as Record<string, Record<string, Record<string, unknown>>>)[
        '/api/2.1/clusters/{workspace_id}/list'
      ].get.parameters
    ).toContainEqual({
      name: 'workspace_id',
      in: 'path',
      required: true,
      schema: { type: 'string' },
    });
  });

  it('names the supported formats', () => {
    expect(isMarkdownReferenceFormat('brave-markdown')).toBe(true);
    expect(isMarkdownReferenceFormat('markdown')).toBe(false);
    expect(isMarkdownReferenceFormat('constructor')).toBe(false);
    expect(isMarkdownReferenceFormat('__proto__')).toBe(false);
  });
});

describe('readLlmsIndex', () => {
  it('lists the Markdown pages an llms.txt links to, as absolute URLs', () => {
    const index = [
      '# Databricks API Reference',
      '',
      '## jobs/v2',
      '',
      '- [Trigger a new job run](jobs/v2/run-now.md)',
      '- [The Run object](jobs/v2/run/object.md)',
      '- [Trigger a new job run](jobs/v2/run-now.md)',
      '- [Terms of service](https://example.com/terms)',
    ].join('\n');

    expect(readLlmsIndex(index, 'https://docs.databricks.com/api/llms.txt')).toEqual([
      'https://docs.databricks.com/api/jobs/v2/run-now.md',
      'https://docs.databricks.com/api/jobs/v2/run/object.md',
    ]);
  });

  it('skips links to another origin and links that are not valid URLs', () => {
    const index = [
      '- [Run](run.md)',
      '- [Other host](https://evil.example.com/run.md)',
      '- [Internal](http://169.254.169.254/latest/meta-data.md)',
      '- [Other port](https://docs.databricks.com:8443/run.md)',
      '- [Other scheme](http://docs.databricks.com/run.md)',
      '- [Malformed](https://exa%mple.com/run.md)',
      '- [No host](https://:80/run.md)',
      '- [Absolute](https://docs.databricks.com/api/jobs/v2/get.md)',
    ].join('\n');

    expect(readLlmsIndex(index, 'https://docs.databricks.com/api/llms.txt')).toEqual([
      'https://docs.databricks.com/api/run.md',
      'https://docs.databricks.com/api/jobs/v2/get.md',
    ]);
  });

  it('reads a long run of unclosed links in linear time', () => {
    const text = `${'[](!'.repeat(50_000)}\n- [Run](run.md)`;
    const start = Date.now();

    expect(readLlmsIndex(text, 'https://example.com/llms.txt')).toEqual([
      'https://example.com/run.md',
    ]);
    expect(Date.now() - start).toBeLessThan(1000);
  });
});
