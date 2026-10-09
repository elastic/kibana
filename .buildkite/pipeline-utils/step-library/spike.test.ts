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
import { parse } from 'yaml';
import {
  _resetPendingCancelKeys,
  flushCancelOnGateFailureMetadata,
  getPipeline,
} from '../buildkite/utils.ts';

import { cpsTests, getStepKeys, renderSteps } from './index.ts';

const mockExecFileSync = jest.fn();
jest.mock('child_process', () => ({
  execFileSync: (...args: unknown[]) => mockExecFileSync(...args),
}));

// getKibanaDir() shells out to git via child_process, which this file mocks globally.
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
  ];
};

const load = (file: string) => parse(fs.readFileSync(path.join(root, file), 'utf8'));

const legacyKeys = (file: string): string[] | 'throws' => {
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

// Converts numeric-string exit statuses to integers, the form Buildkite's schema specifies, so two
// documents compare equal on meaning.
const normalizeExitStatus = (document: { steps: Array<Record<string, unknown>> }) => ({
  ...document,
  steps: document.steps.map((step) => {
    const automatic = (step.retry as { automatic?: unknown } | undefined)?.automatic;
    if (!Array.isArray(automatic)) {
      return step;
    }
    return {
      ...step,
      retry: {
        automatic: automatic.map((rule: { exit_status: unknown }) =>
          typeof rule.exit_status === 'string' && /^-?\d+$/.test(rule.exit_status)
            ? { ...rule, exit_status: Number(rule.exit_status) }
            : rule
        ),
      },
    };
  }),
});

describe('spike', () => {
  it('cps_testing in TypeScript equals the legacy YAML, apart from the integer exit status', () => {
    const rendered = parse(renderSteps(cpsTests(), { header: true }));
    const raw = load('.buildkite/pipelines/pull_request/cps_testing.yml');

    // The two differ only by the type of the exit status. Normalized, they match.
    expect(rendered).not.toEqual(raw);
    expect(rendered).toEqual(normalizeExitStatus(raw));
  });

  describe.each(fragmentPaths())('%s', (file) => {
    const doc = load(file);

    it('round-trips through the renderer unchanged', () => {
      const rendered = parse(renderSteps(doc.steps ?? [], { header: true }));
      expect(rendered).toEqual({ steps: doc.steps ?? [] });
    });

    it('continues a document that already has a steps: header', () => {
      const first = 'steps:\n  - command: a.sh\n    key: a\n';
      const parsed = parse(first + renderSteps(doc.steps ?? []));
      expect(parsed.steps).toEqual([{ command: 'a.sh', key: 'a' }, ...(doc.steps ?? [])]);
    });

    it('registers the same cancel keys as the YAML path', () => {
      const legacy = legacyKeys(file);
      let mine: string[] | 'throws';
      try {
        mine = getStepKeys(doc.steps ?? []);
      } catch {
        mine = 'throws';
      }
      expect(mine).toEqual(legacy);
    });
  });
});
