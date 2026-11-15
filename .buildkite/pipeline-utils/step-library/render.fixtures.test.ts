/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

// Runs the renderer over every static YAML fragment that still exists.
// The number of checks will get smaller as more YAML fragments are ported to
// the TypeScript library, and this file can be deleted once the migration is
// complete.

import fs from 'fs';
import path from 'path';
import { parse } from 'yaml';
import {
  _resetPendingCancelKeys,
  flushCancelOnGateFailureMetadata,
  getPipeline,
} from '../buildkite/utils.ts';
import { getStepKeys, renderSteps } from './render.ts';
import type { Step } from './types.ts';

const mockExecFileSync = jest.fn();
jest.mock('child_process', () => ({
  execFileSync: (...args: unknown[]) => mockExecFileSync(...args),
}));

// getKibanaDir() runs git through child_process, which this file mocks, so the root comes from the
// path instead. `getPipeline` reads fragment paths relative to the repo root.
const root = path.resolve(__dirname, '../../..');
process.chdir(root);

const fragmentPaths = (): string[] => {
  const dir = '.buildkite/pipelines/pull_request';
  return [
    ...fs
      .readdirSync(path.join(root, dir), { recursive: true, encoding: 'utf8' })
      .filter((file) => file.endsWith('.yml'))
      .map((file) => `${dir}/${file}`),
    '.buildkite/pipelines/fips/verify_fips_enabled.yml',
  ].filter((file) => fs.existsSync(path.join(root, file)));
};

const load = (file: string) => parse(fs.readFileSync(path.join(root, file), 'utf8'));

const yamlPathKeys = (file: string): string[] | 'throws' => {
  mockExecFileSync.mockReset();
  _resetPendingCancelKeys();
  try {
    getPipeline(file, { cancelOnGateFailure: true });
  } catch {
    return 'throws';
  }
  flushCancelOnGateFailureMetadata();
  return mockExecFileSync.mock.calls.length
    ? JSON.parse(mockExecFileSync.mock.calls[0][2].input)
    : [];
};

describe.each(fragmentPaths())('%s', (file) => {
  const steps: Step[] = load(file).steps ?? [];

  it('round-trips through the renderer unchanged', () => {
    expect(parse(renderSteps(steps, { header: true }))).toEqual({ steps });
  });

  it('continues a document that already has a steps: header', () => {
    const first = 'steps:\n  - command: a.sh\n    key: a\n';
    expect(parse(first + renderSteps(steps)).steps).toEqual([
      { command: 'a.sh', key: 'a' },
      ...steps,
    ]);
  });

  it('registers the same cancel keys as getPipeline does', () => {
    let rendered: string[] | 'throws';
    try {
      rendered = getStepKeys(steps);
    } catch {
      rendered = 'throws';
    }
    expect(rendered).toEqual(yamlPathKeys(file));
  });
});
