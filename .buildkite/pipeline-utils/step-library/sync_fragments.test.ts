/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import fs from 'fs';
import path from 'path';
import { getKibanaDir } from '#pipeline-utils/get_kibana_dir';
import {
  listPullRequestYamlNames,
  pruneFragmentSnapshots,
  syncFragmentRegistry,
} from './sync_fragments.ts';

const source = (entries: string[]) =>
  [
    'const a = 1;',
    'export const FRAGMENTS: readonly Fragment[] = [',
    ...entries,
    '];',
    'const b = 2;',
  ].join('\n');

describe('syncFragmentRegistry', () => {
  it('adds a missing YAML in sorted position and drops a deleted unported one', () => {
    const before = source([
      "  yamlFragment('fips/verify_fips_enabled'),",
      "  yamlFragment('pull_request/a'),",
      "  { ...yamlFragment('pull_request/ported'), steps: ported },",
      "  yamlFragment('pull_request/gone'),",
      "  yamlFragment('pull_request/z'),",
    ]);

    expect(
      syncFragmentRegistry(before, ['pull_request/a', 'pull_request/m', 'pull_request/z'])
    ).toEqual({
      source: source([
        "  yamlFragment('fips/verify_fips_enabled'),",
        "  yamlFragment('pull_request/a'),",
        "  yamlFragment('pull_request/m'),",
        "  { ...yamlFragment('pull_request/ported'), steps: ported },",
        "  yamlFragment('pull_request/z'),",
      ]),
      removed: ['pull_request/gone'],
    });
  });

  it('refuses an entry it cannot read', () => {
    expect(() => syncFragmentRegistry(source(['  {']), [])).toThrow('unrecognized entry');
  });

  it('is a no-op on the real registry when it is already in sync', () => {
    const file = path.join(getKibanaDir(), '.buildkite/pipeline-utils/step-library/fragments.ts');
    const current = fs.readFileSync(file, 'utf8');

    expect(syncFragmentRegistry(current, listPullRequestYamlNames(getKibanaDir()))).toEqual({
      source: current,
      removed: [],
    });
  });
});

describe('pruneFragmentSnapshots', () => {
  const entry = (name: string) =>
    `exports[\`pull_request fragments ${name} 1\`] = \`\n{\n  "a": 1,\n}\n\`;\n`;
  const file = (...names: string[]) =>
    ['// Jest Snapshot v1, https://jestjs.io/docs/snapshot-testing\n', ...names.map(entry)].join(
      '\n'
    );

  it('drops only the named entries and keeps the rest byte-for-byte', () => {
    expect(
      pruneFragmentSnapshots(file('pull_request/a', 'pull_request/b', 'pull_request/c'), [
        'pull_request/b',
      ])
    ).toBe(file('pull_request/a', 'pull_request/c'));
  });

  it('is a no-op when nothing was removed', () => {
    expect(pruneFragmentSnapshots(file('pull_request/a'), [])).toBe(file('pull_request/a'));
  });

  it('matches the committed snapshot file for a real fragment', () => {
    const snapshot = fs.readFileSync(
      path.join(
        getKibanaDir(),
        '.buildkite/pipeline-utils/step-library/__snapshots__/fragments.test.ts.snap'
      ),
      'utf8'
    );
    const pruned = pruneFragmentSnapshots(snapshot, ['pull_request/storybooks']);

    expect(pruned).not.toContain('pull_request fragments pull_request/storybooks 1');
    expect(pruned).toContain('pull_request fragments pull_request/renovate 1');
  });
});
