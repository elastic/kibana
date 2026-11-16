/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { findAlwaysFailure, type StepFailures, UNSUPPORTED_RUN } from '@kbn/workflows/graph';
import type { Fixture } from '../run_outcomes_parity_fixtures';
import {
  done,
  failing,
  forAnalyzer,
  ifA,
  maybe,
  output,
  runEverywhere,
  toVerdict,
} from '../run_outcomes_parity_fixtures';
import { WorkflowRunFixture } from '../workflow_run_fixture';

// `FAIL` steps reach the analysis as calls to the workflow `broken`, which fail every time.
const ANALYZER_STEPS: StepFailures<string> = {
  callFailure: ({ name, with: withBlock }) =>
    typeof withBlock === 'object' &&
    withBlock !== null &&
    (withBlock as Record<string, unknown>)['workflow-id'] === 'broken'
      ? String(name)
      : undefined,
  endStepFailure: ({ name, status = 'completed' }) => {
    if (status === 'completed') {
      return undefined;
    }
    return status === 'failed' || status === 'cancelled' ? String(name) : 'mayFail';
  },
};

const FIXTURES: Record<string, Fixture> = {
  'a failing step': { steps: [failing('f')] },
  'a failing step after one that may fail': { steps: [maybe('m'), failing('f')] },
  'a failing step that continues': { steps: [failing('f', { 'on-failure': { continue: true } })] },
  'a failing step that retries': {
    steps: [failing('f', { 'on-failure': { retry: { 'max-attempts': 2 } } })],
  },
  'a fallback that does not complete the run': {
    steps: [failing('f', { 'on-failure': { fallback: [maybe('m')] } })],
  },
  'a fallback that completes the run': {
    steps: [failing('f', { 'on-failure': { fallback: [done] } })],
  },
  'a fallback that completes the run after a step that may fail': {
    steps: [failing('f', { 'on-failure': { fallback: [maybe('m'), done] } })],
  },
  'a fallback that fails before completing': {
    steps: [failing('f', { 'on-failure': { fallback: [failing('g'), done] } })],
  },
  'a nested fallback that completes the run': {
    steps: [
      failing('f', {
        'on-failure': { fallback: [failing('g', { 'on-failure': { fallback: [done] } })] },
      }),
    ],
  },
  'a workflow-level fallback that completes the run': {
    settings: { 'on-failure': { fallback: [done] } },
    steps: [failing('f')],
  },
  'a workflow-level fallback that fails': {
    settings: { 'on-failure': { fallback: [failing('g'), done] } },
    steps: [failing('f')],
  },
  'a workflow-level continue': {
    settings: { 'on-failure': { continue: true } },
    steps: [failing('f')],
  },
  'a step-level handler that replaces the workflow-level fallback': {
    settings: { 'on-failure': { fallback: [done] } },
    steps: [failing('f', { 'on-failure': { fallback: [maybe('m')] } })],
  },
  'a failing step in an if': { steps: [ifA('i', [failing('f')])] },
  'a failing step in both branches': {
    steps: [ifA('i', [failing('f')], { else: [failing('g')] })],
  },
  'a failing step after a conditional completion': {
    steps: [ifA('i', [done]), failing('f')],
  },
  'a failing step after a completion': { steps: [done, failing('f')] },
  'a failing step in an if with its own continue': {
    steps: [ifA('i', [failing('f')], { 'on-failure': { continue: true } })],
  },
  'a failing step in a foreach': {
    steps: [{ name: 'loop', type: 'foreach', foreach: '[1, 2]', steps: [failing('f')] }],
  },
  'a failing step in a foreach over nothing': {
    steps: [{ name: 'loop', type: 'foreach', foreach: '[]', steps: [failing('f')] }],
  },
  'a failing step after a conditional loop.break': {
    steps: [
      {
        name: 'loop',
        type: 'foreach',
        foreach: '[1, 2]',
        steps: [ifA('stop', [{ name: 'b', type: 'loop.break' }]), failing('f')],
      },
    ],
  },
  'a failing step in the first while iteration': {
    steps: [
      {
        name: 'loop',
        type: 'while',
        condition: 'inputs.a : true',
        'max-iterations': 2,
        steps: [failing('f')],
      },
    ],
  },
  'an end step that fails the run': { steps: [maybe('m'), output('stop', {}, 'failed')] },
  'a workflow.fail step': {
    steps: [{ name: 'stop', type: 'workflow.fail', with: { message: 'no' } }],
  },
  'an end step that fails the run, with a workflow-level fallback': {
    settings: { 'on-failure': { fallback: [done] } },
    steps: [maybe('m'), output('stop', {}, 'failed')],
  },
  'an end step that fails the run, after a wait and a workflow-level fallback': {
    settings: { 'on-failure': { fallback: [done] } },
    steps: [
      { name: 'pause', type: 'wait', with: { duration: '1ms' } },
      output('stop', {}, 'failed'),
    ],
  },
  'an end step that fails the run but fails to render first, with a workflow-level fallback': {
    settings: { 'on-failure': { fallback: [done] } },
    steps: [output('stop', { message: '{{ "%" | url_decode }}' }, 'failed')],
  },
  'an end step that fails to render, with a workflow-level fallback': {
    settings: { 'on-failure': { fallback: [done] } },
    steps: [output('emit', { message: '{{ "%" | url_decode }}' })],
  },
  'a failing step that continues when a condition holds': {
    steps: [failing('f', { 'on-failure': { continue: 'inputs.a : true' } })],
  },
  'a failing step in every switch case and the default': {
    steps: [
      {
        name: 'sw',
        type: 'switch',
        expression: '{{ inputs.a }}',
        cases: [{ match: true, steps: [failing('f')] }],
        default: [failing('g')],
      },
    ],
  },
  'a failing step in every switch case, without a default': {
    steps: [
      {
        name: 'sw',
        type: 'switch',
        expression: '{{ inputs.a }}',
        cases: [{ match: true, steps: [failing('f')] }],
      },
    ],
  },
  'a failing parallel branch': {
    steps: [
      {
        name: 'fan',
        type: 'parallel',
        branches: [
          { name: 'one', steps: [failing('f')] },
          { name: 'two', steps: [maybe('m')] },
        ],
      },
    ],
  },
  'a failing parallel branch that settles': {
    steps: [
      {
        name: 'fan',
        type: 'parallel',
        mode: 'settled',
        branches: [
          { name: 'one', steps: [failing('f')] },
          { name: 'two', steps: [maybe('m')] },
        ],
      },
    ],
  },
  'a parallel branch that ends the run failed': {
    steps: [
      {
        name: 'fan',
        type: 'parallel',
        branches: [
          { name: 'one', steps: [output('stop', {}, 'failed')] },
          { name: 'two', steps: [maybe('m')] },
        ],
      },
    ],
  },
  'a parallel branch that ends the run failed, in a step that settles': {
    steps: [
      {
        name: 'fan',
        type: 'parallel',
        mode: 'settled',
        branches: [
          { name: 'one', steps: [output('stop', {}, 'failed')] },
          { name: 'two', steps: [failing('f')] },
        ],
      },
    ],
  },
  'a parallel branch that ends the run failed after a step that may fail': {
    steps: [
      {
        name: 'fan',
        type: 'parallel',
        branches: [
          { name: 'one', steps: [maybe('m'), output('stop', {}, 'failed')] },
          { name: 'two', steps: [maybe('n')] },
        ],
      },
    ],
  },
  'a parallel branch that ends the run failed after a step that may fail, in a step that settles': {
    steps: [
      {
        name: 'fan',
        type: 'parallel',
        mode: 'settled',
        branches: [{ name: 'one', steps: [maybe('m'), output('stop', {}, 'failed')] }],
      },
    ],
  },
  'a fallback that leaves the loop': {
    steps: [
      {
        name: 'loop',
        type: 'foreach',
        foreach: '[1, 2]',
        steps: [failing('f', { 'on-failure': { fallback: [{ name: 'b', type: 'loop.break' }] } })],
      },
    ],
  },
  'a failing step in a nested fallback after a completing branch': {
    steps: [
      failing('f', {
        'on-failure': { fallback: [ifA('i', [done], { else: [failing('g')] })] },
      }),
    ],
  },
};

describe('run outcome analysis parity with the engine', () => {
  let workflowRunFixture: WorkflowRunFixture;

  beforeEach(() => {
    workflowRunFixture = new WorkflowRunFixture();
  });

  it.each(Object.entries(FIXTURES))(
    'agrees on whether every run fails: %s',
    async (_name, fixture) => {
      const statuses = await runEverywhere(workflowRunFixture, fixture);
      const failure = findAlwaysFailure(forAnalyzer(fixture), ANALYZER_STEPS);

      expect({
        analyzerFailsEveryRun: failure !== undefined && failure !== UNSUPPORTED_RUN,
        analyzerUnchecked: failure === UNSUPPORTED_RUN,
        engineStatuses: [...new Set(statuses)].sort(),
      }).toEqual({
        analyzerFailsEveryRun: toVerdict(statuses) === 'fails',
        analyzerUnchecked: false,
        engineStatuses: [...new Set(statuses)].sort(),
      });
    }
  );
});
