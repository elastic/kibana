/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

jest.mock('#pipeline-utils', () => ({
  expandAgentQueue: (queue: string, size: number) => ({ queue, size }),
}));

import {
  buildFunctionalStepGroup,
  buildJestStep,
  registerCancelKeys,
  sortFunctionalGroups,
} from './steps';
import type { FunctionalGroup } from './types';

describe('buildJestStep', () => {
  const baseOpts = {
    command: 'scripts/run_jest_unit.sh',
    label: 'Jest Tests',
    parallelism: 4,
    key: 'jest' as const,
    agentDiskSize: 110,
    envFromLabels: { FOO: 'bar' },
    dependsOn: ['build'],
    retryCount: 2,
  };

  it('returns undefined when there is no parallelism', () => {
    expect(buildJestStep({ ...baseOpts, parallelism: 0 })).toBeUndefined();
  });

  it('builds a step with parallelism and retries', () => {
    const step = buildJestStep(baseOpts) as any;

    expect(step.label).toBe('Jest Tests');
    expect(step.command).toBe('scripts/run_jest_unit.sh');
    expect(step.parallelism).toBe(4);
    expect(step.key).toBe('jest');
    expect(step.depends_on).toEqual(['build']);
    expect(step.env).toEqual({ FOO: 'bar' });
    expect(step.retry.automatic).toEqual([
      { exit_status: '-1', limit: 3 },
      { exit_status: '*', limit: 2 },
    ]);
  });

  it('omits the wildcard retry when retryCount is 0', () => {
    const step = buildJestStep({ ...baseOpts, retryCount: 0 }) as any;
    expect(step.retry.automatic).toEqual([{ exit_status: '-1', limit: 3 }]);
  });
});

describe('sortFunctionalGroups', () => {
  it('sorts numeric sortBy ascending', () => {
    const groups: FunctionalGroup[] = [
      { title: 'b', key: 'b', sortBy: 2, queue: 'q' },
      { title: 'a', key: 'a', sortBy: 1, queue: 'q' },
    ];
    expect(sortFunctionalGroups(groups).map((g) => g.key)).toEqual(['a', 'b']);
  });

  it('sorts string sortBy lexicographically', () => {
    const groups: FunctionalGroup[] = [
      { title: 'z', key: 'z', sortBy: 'zeta', queue: 'q' },
      { title: 'a', key: 'a', sortBy: 'alpha', queue: 'q' },
    ];
    expect(sortFunctionalGroups(groups).map((g) => g.key)).toEqual(['a', 'z']);
  });

  it('places numeric-sorted groups after string-sorted groups', () => {
    const groups: FunctionalGroup[] = [
      { title: 'num', key: 'num', sortBy: 1, queue: 'q' },
      { title: 'str', key: 'str', sortBy: 'alpha', queue: 'q' },
    ];
    expect(sortFunctionalGroups(groups).map((g) => g.key)).toEqual(['str', 'num']);
  });
});

describe('buildFunctionalStepGroup', () => {
  const baseOpts = {
    command: 'scripts/run_ftr.sh',
    defaultQueue: 'default-q',
    ftrExtraArgs: { FTR_EXTRA_ARGS: '--bail' },
    envFromLabels: { LABEL: 'v' },
    dependsOn: ['build'],
    retryCount: 1,
  };

  it('returns undefined when there are no functional groups', () => {
    expect(buildFunctionalStepGroup({ ...baseOpts, functionalGroups: [] })).toBeUndefined();
  });

  it('builds a group with sorted child steps and merged env', () => {
    const groups: FunctionalGroup[] = [
      { title: 'B', key: 'b', sortBy: 2, queue: 'q1' },
      { title: 'A', key: 'a', sortBy: 1, queue: 'q1' },
    ];

    const step = buildFunctionalStepGroup({ ...baseOpts, functionalGroups: groups }) as any;

    expect(step.group).toBe('FTR Configs');
    expect(step.key).toBe('ftr-configs');
    expect(step.depends_on).toEqual(['build']);
    expect(step.steps.map((s: any) => s.key)).toEqual(['a', 'b']);

    const first = step.steps[0];
    expect(first.command).toBe('scripts/run_ftr.sh');
    expect(first.env).toEqual({
      FTR_CONFIG_GROUP_KEY: 'a',
      FTR_EXTRA_ARGS: '--bail',
      LABEL: 'v',
    });
    expect(first.retry.automatic).toEqual([
      { exit_status: '-1', limit: 3 },
      { exit_status: '*', limit: 1 },
    ]);
  });
});

describe('registerCancelKeys', () => {
  it('writes only the keys that are actually scheduled', () => {
    const setMetadata = jest.fn();
    const bk = { setMetadata } as any;

    registerCancelKeys(bk, {
      unitCount: 0,
      integrationCount: 2,
      functionalGroups: [
        { title: 'A', key: 'ftr_configs_0', sortBy: 1, queue: 'q' },
        { title: 'B', key: 'ftr_configs_1', sortBy: 2, queue: 'q' },
      ],
    });

    expect(setMetadata).toHaveBeenCalledWith(
      'cancel_on_gate_failure_batch:test_groups',
      JSON.stringify(['jest-integration', 'ftr_configs_0', 'ftr_configs_1'])
    );
  });
});
