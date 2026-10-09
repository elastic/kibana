/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

// Shows how the SDK-based step types are used. Jest does not report type errors in this
// workspace, so `tsc` (`npm run typecheck`) is what checks the type-level assertions here.

import { parse } from 'yaml';
import { commandStep, genericStep, groupStep, waitStep } from './helpers.ts';
import { renderSteps } from './render.ts';
import type { CommandStep, GroupStep, Step, WaitStep } from './types.ts';

// Type-level assertions, with no suppression comments. `Record<never, never>` is an empty object
// type: it is assignable to `Pick<T, K>` only when K is optional. An alias that resolves to `false`
// makes the tuple below fail to compile, because `true` is not assignable to `false`.
type IsRequired<T, K extends keyof T> = Record<never, never> extends Pick<T, K> ? false : true;
type HasNoKey<T, K extends string> = K extends keyof T ? false : true;

describe('SDK-based step types', () => {
  it('requires key, label and agents on command steps and a key on groups', () => {
    const assertions: [
      IsRequired<CommandStep, 'key'>,
      IsRequired<CommandStep, 'label'>,
      IsRequired<CommandStep, 'agents'>,
      IsRequired<GroupStep, 'key'>
    ] = [true, true, true, true];
    expect(assertions.every(Boolean)).toBe(true);
  });

  it('does not accept a machineType step field (it belongs in agents)', () => {
    const assertion: HasNoKey<CommandStep, 'machineType'> = true;
    expect(assertion).toBe(true);
  });

  it('types wait as null, as the fragments write it', () => {
    const assertion: WaitStep['wait'] extends null ? true : false = true;
    expect(assertion).toBe(true);
  });

  it('accepts the field shapes pipeline steps use', () => {
    const step = commandStep({
      command: '.buildkite/scripts/steps/example.sh',
      key: 'example',
      label: 'Example',
      agents: { machineType: 'n2-standard-4', preemptible: true, diskSizeGb: 50 },
      depends_on: ['build'], // a list or a string, never coerced
      timeout_in_minutes: 60,
      parallelism: 8,
      soft_fail: true,
      if: "build.env('GITHUB_PR_TARGET_BRANCH') == 'main'",
      env: { CHECK_GATE: 'true', COUNT: 3 }, // values may be strings or numbers
      artifact_paths: ['target/out.json'],
      plugins: [{ 'sparse-checkout#v1.6.0': { no_cone: true } }],
      id: 'example_id',
      retry: {
        automatic: [
          { exit_status: -1, limit: 3 },
          { exit_status: '*', limit: 1 },
        ],
      },
    });
    const noAutomaticRetry = commandStep({
      command: 'a.sh',
      key: 'a',
      label: 'A',
      agents: {},
      retry: { automatic: false },
    });

    expect(parse(renderSteps([step, noAutomaticRetry], { header: true })).steps).toEqual([
      step,
      noAutomaticRetry,
    ]);
  });

  it('builds a group, a wait and a keyless step', () => {
    const steps: Step[] = [
      groupStep({
        group: 'Suite',
        key: 'suite',
        depends_on: 'build',
        steps: [commandStep({ command: 'a.sh', key: 'a', label: 'A', agents: {} })],
      }),
      // `WaitStep` replaces the SDK's string `wait` with a required null, as Buildkite's schema
      // allows, so the emitted YAML is `wait: null` with no cast.
      waitStep({ continue_on_failure: true }),
      // A command step with no key cannot be a CommandStep, so it uses the GenericStep escape hatch.
      genericStep({
        command: '.buildkite/scripts/lifecycle/post_build.sh',
        label: 'Post-Build',
        agents: {},
      }),
    ];

    expect(parse(renderSteps(steps, { header: true })).steps).toEqual([
      {
        group: 'Suite',
        key: 'suite',
        depends_on: 'build',
        steps: [{ command: 'a.sh', key: 'a', label: 'A', agents: {} }],
      },
      { wait: null, continue_on_failure: true },
      { command: '.buildkite/scripts/lifecycle/post_build.sh', label: 'Post-Build', agents: {} },
    ]);
  });
});
