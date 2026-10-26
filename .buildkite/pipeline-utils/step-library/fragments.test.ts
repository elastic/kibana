/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

// Every fragment is compared with a committed snapshot. A fragment loads from its TypeScript
// function once it has one, and from its YAML file until then. Both go through the same semantic
// normalization, so a ported fragment must match the snapshot of the YAML it replaces.

import fs from 'fs';
import path from 'path';
import { getKibanaDir } from '#pipeline-utils/get_kibana_dir';
import type { Fragment } from './fragments.ts';
import { FRAGMENTS, loadFragmentDocument } from './fragments.ts';

const root = getKibanaDir();

// Set by the quick check that regenerates snapshots with `-u`. A ported fragment's snapshot is what
// its TypeScript must match, so it is skipped (not removed, which `-u` would treat as obsolete).
const skipPorted = process.env.SKIP_PORTED_FRAGMENTS === 'true';

const matchesSnapshot = (_name: string, fragment: Fragment) => {
  expect(loadFragmentDocument(fragment)).toMatchSnapshot();
};

describe('pull_request fragments', () => {
  const table = (ported: boolean) =>
    FRAGMENTS.filter((fragment) => Boolean(fragment.steps) === ported).map(
      (fragment) => [fragment.name, fragment] as const
    );

  it.each(table(false))('%s', matchesSnapshot);
  (skipPorted ? it.skip : it).each(table(true))('%s', matchesSnapshot);

  it('registers every YAML fragment that still exists', () => {
    const dir = path.join(root, '.buildkite/pipelines/pull_request');
    const onDisk = fs
      .readdirSync(dir, { recursive: true, encoding: 'utf8' })
      .filter((file) => file.endsWith('.yml'))
      .map((file) => `.buildkite/pipelines/pull_request/${file}`);
    const registered = FRAGMENTS.map((fragment) => fragment.yamlPath);

    expect(onDisk.filter((file) => !registered.includes(file))).toEqual([]);
  });

  it('has no ported fragment whose YAML file is still on disk', () => {
    const stale = FRAGMENTS.filter(
      (fragment) => fragment.steps && fs.existsSync(path.join(root, fragment.yamlPath))
    );

    expect(stale.map((fragment) => fragment.name)).toEqual([]);
  });
});
