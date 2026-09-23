/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

// Run with: node --test .github/scripts/prefetch_pr_context.test.ts
import type { TestContext } from 'node:test';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { prefetchPrContext } = require('./prefetch_pr_context');

const createContext = (context: TestContext, baseRefOid?: string) => {
  const outputDir = fs.mkdtempSync(path.join(os.tmpdir(), 'prefetch-pr-context-'));
  context.after(() => fs.rmSync(outputDir, { recursive: true, force: true }));
  const outputs = new Map<string, string>();
  const github = {
    graphql: async (query: string, variables: { number: number }) => {
      assert.equal(variables.number, 123);
      if (query.includes('baseRefName')) {
        assert.match(query, /baseRefOid/);
      }
      return {
        repository: {
          pullRequest: {
            number: 123,
            author: null,
            baseRefName: '9.5',
            baseRefOid,
            headRefName: 'fix/test',
            labels: { nodes: [] },
            timelineItems: { nodes: [] },
            reviewThreads: { nodes: [], pageInfo: { hasNextPage: false } },
          },
        },
      };
    },
    paginate: async () => [],
    rest: {
      pulls: { listFiles: 'listFiles', listReviews: 'listReviews' },
      issues: { listComments: 'listComments' },
    },
  };
  const core = {
    info: () => undefined,
    setOutput: (name: string, value: string) => outputs.set(name, value),
  };
  return { github, core, outputDir, outputs, repoFullName: 'elastic/kibana', pullNumber: 123 };
};

test('exports the selected PR base SHA and preserves it in the context artifact', async (context: TestContext) => {
  const baseSha = 'a'.repeat(40);
  const fixture = createContext(context, baseSha);

  await prefetchPrContext(fixture);

  assert.equal(fixture.outputs.get('base_sha'), baseSha);
  const metadata = JSON.parse(
    fs.readFileSync(path.join(fixture.outputDir, 'pr-metadata.json'), 'utf8')
  );
  assert.equal(metadata.baseRefName, '9.5');
  assert.equal(metadata.baseRefOid, baseSha);
});

for (const baseSha of [undefined, '', 'main', 'a'.repeat(39)]) {
  test(`rejects invalid base SHA ${JSON.stringify(
    baseSha
  )} before publishing context`, async (context: TestContext) => {
    const fixture = createContext(context, baseSha);

    await assert.rejects(prefetchPrContext(fixture), /has no valid base commit SHA/);

    assert.equal(fixture.outputs.size, 0);
    assert.equal(fs.existsSync(path.join(fixture.outputDir, 'pr-metadata.json')), false);
  });
}
