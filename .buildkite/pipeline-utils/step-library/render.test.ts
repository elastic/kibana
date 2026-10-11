/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { parse } from 'yaml';
import { _resetPendingCancelKeys, flushCancelOnGateFailureMetadata } from '../buildkite/utils.ts';
import { commandStep, gateStep, genericStep, groupStep, waitStep } from './helpers.ts';
import { getStepKeys, renderSteps } from './render.ts';
import type { CommandStep } from './types.ts';

const mockExecFileSync = jest.fn();
jest.mock('child_process', () => ({
  execFileSync: (...args: unknown[]) => mockExecFileSync(...args),
}));

const step = (key: string, extra: Partial<CommandStep> = {}) =>
  commandStep({
    command: `${key}.sh`,
    key,
    label: key,
    agents: { machineType: 'n2-standard-2' },
    ...extra,
  });

const registeredKeys = (): string[] => {
  flushCancelOnGateFailureMetadata();
  return mockExecFileSync.mock.calls.length
    ? JSON.parse(mockExecFileSync.mock.calls[0][2].input)
    : [];
};

describe('renderSteps', () => {
  beforeEach(() => {
    mockExecFileSync.mockReset();
    _resetPendingCancelKeys();
  });

  it('renders a chunk that continues a document already holding "steps:"', () => {
    const first = 'steps:\n  - command: a.sh\n    key: a\n';
    expect(parse(first + renderSteps([step('b')])).steps).toEqual([
      { command: 'a.sh', key: 'a' },
      step('b'),
    ]);
  });

  it('renders a standalone document with the header', () => {
    expect(parse(renderSteps([step('a')], { header: true }))).toEqual({ steps: [step('a')] });
  });

  it('keeps integer and wildcard exit statuses, colons in labels and multi-line commands', () => {
    const s = step('k', {
      command: 'echo one\necho two\n',
      label: ':github: Sync models:* labels',
      retry: {
        automatic: [
          { exit_status: -1, limit: 3 },
          { exit_status: '*', limit: 1 },
        ],
      },
    });
    expect(parse(renderSteps([s], { header: true })).steps[0]).toEqual(s);
  });

  it('keeps retry.automatic false and numeric env values', () => {
    const s = step('k', { retry: { automatic: false }, env: { COUNT: 3, NAME: 'x' } });
    expect(parse(renderSteps([s], { header: true })).steps[0]).toEqual(s);
  });

  it('does not coerce depends_on', () => {
    const [a, b] = parse(
      renderSteps([step('a', { depends_on: 'build' }), step('b', { depends_on: ['build'] })], {
        header: true,
      })
    ).steps;
    expect(a.depends_on).toBe('build');
    expect(b.depends_on).toEqual(['build']);
  });

  it('gateStep adds CHECK_GATE and keeps other env', () => {
    expect(gateStep(step('a', { env: { FOO: 'bar' } })).env).toEqual({
      FOO: 'bar',
      CHECK_GATE: 'true',
    });
  });

  it('waitStep renders a null wait and keeps continue_on_failure', () => {
    expect(waitStep({ continue_on_failure: true })).toEqual({
      wait: null,
      continue_on_failure: true,
    });
    expect(parse(renderSteps([waitStep()], { header: true })).steps).toEqual([{ wait: null }]);
  });

  describe('cancel keys', () => {
    it('registers command keys and group children, never the group key', () => {
      renderSteps(
        [step('a'), groupStep({ group: 'g', key: 'g', steps: [step('c')] }), waitStep()],
        { cancelOnGateFailure: true }
      );
      expect(registeredKeys()).toEqual(['a', 'c']);
    });

    it('registers nothing unless asked', () => {
      renderSteps([step('a')]);
      expect(registeredKeys()).toEqual([]);
    });

    it('throws for a generic command step without a key', () => {
      expect(() => getStepKeys([genericStep({ command: 'a.sh', label: 'No key' })])).toThrow(
        'step "No key" is missing a "key" (required for cancelOnGateFailure)'
      );
    });
  });
});
