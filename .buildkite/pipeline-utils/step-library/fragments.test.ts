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
import { parse } from 'yaml';
import { getKibanaDir } from '#pipeline-utils/get_kibana_dir';
import { FRAGMENTS } from './fragments.ts';
import type { Fragment } from './fragments.ts';
import { renderSteps } from './render.ts';
import { normalizeSemantics } from './semantic_normalization.ts';

const root = getKibanaDir();

const loadDocument = (fragment: Fragment): unknown =>
  normalizeSemantics(
    fragment.steps
      ? parse(renderSteps(fragment.steps(), { header: true }))
      : parse(fs.readFileSync(path.join(root, fragment.yamlPath), 'utf8'))
  );

describe('pull_request fragments', () => {
  it.each(FRAGMENTS.map((fragment) => [fragment.name, fragment] as const))(
    '%s',
    (_name, fragment) => {
      expect(loadDocument(fragment)).toMatchSnapshot();
    }
  );

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
