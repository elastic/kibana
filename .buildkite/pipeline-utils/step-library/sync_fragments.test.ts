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
import { listPullRequestYamlNames, syncFragmentRegistry } from './sync_fragments.ts';

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
    ).toBe(
      source([
        "  yamlFragment('fips/verify_fips_enabled'),",
        "  yamlFragment('pull_request/a'),",
        "  yamlFragment('pull_request/m'),",
        "  { ...yamlFragment('pull_request/ported'), steps: ported },",
        "  yamlFragment('pull_request/z'),",
      ])
    );
  });

  it('refuses an entry it cannot read', () => {
    expect(() => syncFragmentRegistry(source(['  {']), [])).toThrow('unrecognized entry');
  });

  it('is a no-op on the real registry when it is already in sync', () => {
    const file = path.join(getKibanaDir(), '.buildkite/pipeline-utils/step-library/fragments.ts');
    const current = fs.readFileSync(file, 'utf8');

    expect(syncFragmentRegistry(current, listPullRequestYamlNames(getKibanaDir()))).toBe(current);
  });
});
