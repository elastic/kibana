/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  failureEscapes,
  findAlwaysFailure,
  type StepFailures,
  UNSUPPORTED_RUN,
} from './run_outcomes';
import { WorkflowGraph } from '../workflow_graph/workflow_graph';

const callStep = (name: string) => ({
  name,
  type: 'workflow.execute',
  with: { 'workflow-id': 'child' },
});

const completes = (name: string) => ({ name, type: 'workflow.output', with: { ok: true } });

// Only the call `stepName` fails; `workflow.output` steps fail when they end the run unsuccessfully.
const onlyFailing = (stepName: string): StepFailures<string> => ({
  callFailure: ({ name }) => (name === stepName ? stepName : undefined),
  endStepFailure: ({ name, status }) =>
    status === 'failed' || status === 'cancelled' ? String(name) : undefined,
});

// The names of the steps that run a workflow, wherever they are in the definition.
const callStepNames = (value: unknown): string[] => {
  if (Array.isArray(value)) {
    return value.flatMap(callStepNames);
  }
  if (typeof value !== 'object' || value === null) {
    return [];
  }
  const { type, name } = value as Record<string, unknown>;
  const isCall = type === 'workflow.execute' || type === 'workflow.executeAsync';
  return [
    ...(isCall && typeof name === 'string' ? [name] : []),
    ...Object.values(value).flatMap(callStepNames),
  ];
};

// For each call: whether every run fails when it alone fails.
const failsEveryRun = (definition: unknown) =>
  Object.fromEntries(
    callStepNames(definition).map((stepName) => [
      stepName,
      findAlwaysFailure(definition, onlyFailing(stepName)) === stepName,
    ])
  );

// For each call: whether its failure always fails the run.
const escapes = (definition: unknown) =>
  Object.fromEntries(
    callStepNames(definition).map((stepName) => [
      stepName,
      failureEscapes(definition, stepName, onlyFailing(stepName)),
    ])
  );

describe('findAlwaysFailure', () => {
  it('knows which calls every run reaches, as the engine decides', () => {
    expect(
      failsEveryRun({
        steps: [
          { ...callStep('empty-if'), if: '' },
          { name: 'loop', type: 'while', condition: 'false', steps: [callStep('first-pass')] },
          {
            name: 'fan',
            type: 'parallel',
            branches: [
              { name: 'one', steps: [callStep('branch')] },
              { name: 'two', steps: [{ name: 'noop', type: 'console', with: {} }] },
            ],
          },
          { name: 'early', type: 'workflow.output', if: 'inputs.skip : true', with: {} },
          callStep('after-early-end'),
        ],
      })
    ).toEqual({
      'empty-if': true,
      'first-pass': true,
      branch: true,
      'after-early-end': false,
    });

    expect(
      failsEveryRun({
        settings: { 'on-failure': { fallback: [callStep('on-workflow-failure')] } },
        steps: [
          callStep('always'),
          { ...callStep('guarded'), if: 'inputs.run : true' },
          {
            name: 'branch',
            type: 'if',
            condition: 'true',
            steps: [callStep('then')],
            else: [callStep('otherwise')],
          },
          {
            name: 'loop',
            type: 'foreach',
            foreach: '{{ inputs.items }}',
            steps: [callStep('each')],
          },
          { name: 'listed', type: 'foreach', foreach: '[1, 2]', steps: [callStep('each-listed')] },
          { ...callStep('risky'), 'on-failure': { fallback: [callStep('recover')] } },
        ],
      })
    ).toEqual({
      always: true,
      guarded: false,
      then: false,
      otherwise: false,
      each: false,
      'each-listed': true,
      risky: true,
      recover: false,
      'on-workflow-failure': false,
    });
  });

  it('fails every run when every branch fails', () => {
    const definition = {
      steps: [
        {
          name: 'branch',
          type: 'if',
          condition: 'inputs.a : true',
          steps: [callStep('then')],
          else: [{ name: 'stop', type: 'workflow.fail', with: {} }],
        },
      ],
    };
    expect(findAlwaysFailure(definition, onlyFailing('then'))).toBe('then');
  });

  it('fails every run when a parallel branch ends the run failed', () => {
    const fan = (extra: Record<string, unknown>) => ({
      steps: [
        {
          name: 'fan',
          type: 'parallel',
          branches: [
            { name: 'one', steps: [{ name: 'stop', type: 'workflow.fail', with: {} }] },
            { name: 'two', steps: [callStep('other')] },
          ],
          ...extra,
        },
        completes('done'),
      ],
    });
    expect(findAlwaysFailure(fan({}), onlyFailing('none'))).toBe('stop');
    expect(findAlwaysFailure(fan({ mode: 'settled' }), onlyFailing('none'))).toBe('stop');
  });

  it('can’t tell for a parallel branch that completes the run', () => {
    const definition = {
      steps: [
        {
          name: 'fan',
          type: 'parallel',
          branches: [{ name: 'one', steps: [completes('early')] }],
        },
        callStep('after'),
      ],
    };
    expect(findAlwaysFailure(definition, onlyFailing('after'))).toBe(UNSUPPORTED_RUN);
  });

  it('can’t tell for a workflow that does not compile', () => {
    const definition = {
      steps: [
        {
          name: 'fan',
          type: 'parallel',
          branches: [
            { name: 'one', steps: [{ ...callStep('nested'), if: 'inputs.a : true' }] },
            { name: 'two', steps: [callStep('other')] },
          ],
        },
        callStep('after'),
      ],
    };
    expect(findAlwaysFailure(definition, onlyFailing('after'))).toBe(UNSUPPORTED_RUN);
  });

  describe('with graph nodes it does not know', () => {
    afterEach(() => jest.restoreAllMocks());

    const withExtraNode = (type: string) => {
      const build = WorkflowGraph.fromWorkflowDefinition;
      jest.spyOn(WorkflowGraph, 'fromWorkflowDefinition').mockImplementation((definition) => {
        const graph = build(definition);
        const order = graph.topologicalOrder;
        order.splice(order.length - 1, 0, 'unknown');
        jest
          .spyOn(graph, 'getNode')
          .mockImplementation((id) =>
            id === 'unknown'
              ? ({ id, type, stepId: 'unknown', stepType: type } as ReturnType<
                  typeof graph.getNode
                >)
              : WorkflowGraph.prototype.getNode.call(graph, id)
          );
        return graph;
      });
    };

    it.each(['atomic-v2', 'enter-something'])('reaches no verdict past a %s node', (type) => {
      withExtraNode(type);
      const definition = { steps: [{ name: 'noop', type: 'console', with: {} }, callStep('last')] };
      expect(findAlwaysFailure(definition, onlyFailing('last'))).toBe(UNSUPPORTED_RUN);
    });
  });
});

describe('failureEscapes', () => {
  it('knows which failures an on-failure continue covers', () => {
    expect(
      escapes({
        steps: [
          callStep('plain'),
          { ...callStep('own'), 'on-failure': { continue: true } },
          { ...callStep('templated'), 'on-failure': { continue: 'inputs.lenient : true' } },
          {
            ...callStep('fallback-only'),
            'on-failure': { fallback: [{ name: 'f', type: 'console' }] },
          },
          {
            name: 'wrap',
            type: 'if',
            condition: 'true',
            'on-failure': { continue: true },
            steps: [callStep('inside')],
          },
          {
            name: 'loop',
            type: 'foreach',
            foreach: '[1]',
            'iteration-on-failure': { continue: true },
            steps: [callStep('iteration')],
          },
          {
            name: 'fail-fast',
            type: 'parallel',
            branches: [
              { name: 'a', steps: [callStep('fast-branch')] },
              { name: 'b', steps: [{ name: 'noop', type: 'console', with: {} }] },
            ],
          },
          {
            name: 'settled',
            type: 'parallel',
            mode: 'settled',
            branches: [
              { name: 'a', steps: [callStep('settled-branch')] },
              { name: 'b', steps: [{ name: 'noop2', type: 'console', with: {} }] },
            ],
          },
        ],
      })
    ).toEqual({
      plain: true,
      own: false,
      templated: false,
      'fallback-only': true,
      inside: false,
      iteration: false,
      'fast-branch': true,
      'settled-branch': false,
    });
    expect(
      escapes({ settings: { 'on-failure': { continue: true } }, steps: [callStep('any')] })
    ).toEqual({ any: false });
  });

  it('knows a fallback that completes the run absorbs the failure, but not its own', () => {
    expect(
      escapes({
        steps: [
          {
            ...callStep('ends-in-fallback'),
            'on-failure': { fallback: [callStep('in-fallback'), completes('done')] },
          },
          {
            ...callStep('fails-in-fallback'),
            'on-failure': { fallback: [{ ...completes('cancel'), status: 'cancelled' }] },
          },
        ],
      })
    ).toEqual({ 'ends-in-fallback': false, 'in-fallback': true, 'fails-in-fallback': true });
    expect(
      escapes({
        settings: { 'on-failure': { fallback: [callStep('handler'), completes('done')] } },
        steps: [callStep('any')],
      })
    ).toEqual({ any: false, handler: true });
  });

  it('lets a step-level on-failure replace the workflow-level one, as the engine does', () => {
    expect(
      escapes({
        settings: {
          'on-failure': { continue: true, fallback: [callStep('workflow-fallback')] },
        },
        steps: [
          { ...callStep('own-handler'), 'on-failure': { retry: { 'max-attempts': 2 } } },
          { ...callStep('risky'), 'on-failure': { fallback: [callStep('step-fallback')] } },
          { name: 'branch', type: 'if', condition: 'true', steps: [callStep('nested')] },
        ],
      })
    ).toEqual({
      'own-handler': true,
      risky: true,
      // The workflow-level handler isn't applied inside fallbacks...
      'step-fallback': true,
      // ...but applies to steps nested in flow control, and covers its own fallback.
      nested: false,
      'workflow-fallback': false,
    });
  });

  it('knows nothing escapes a workflow that does not compile', () => {
    expect(
      escapes({
        steps: [
          {
            name: 'fan',
            type: 'parallel',
            branches: [
              { name: 'one', steps: [{ ...callStep('nested'), if: 'inputs.a : true' }] },
              { name: 'two', steps: [callStep('other')] },
            ],
          },
        ],
      })
    ).toEqual({ nested: false, other: false });
  });
});
