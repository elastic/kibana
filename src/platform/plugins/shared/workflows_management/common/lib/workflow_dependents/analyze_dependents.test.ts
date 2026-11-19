/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { analyzeRemovalImpact } from './analyze_dependents';
import {
  collectWorkflowCallSites,
  collectWorkflowOutputBlocks,
  findOutputsPassingThrough,
  findOutputUsages,
  mayLoseImplicitOutput,
  mayRecoverFromFailure,
} from './find_call_sites';
import type { WorkflowLookupItem } from './types';

const CHILD_ID = 'alert-context';

const callStep = (
  name: string,
  withBlock: Record<string, unknown>,
  type = 'workflow.execute',
  workflowId = CHILD_ID
) => ({
  name,
  type,
  with: { 'workflow-id': workflowId, ...withBlock },
});

const workflow = (
  id: string,
  steps: unknown[],
  extra: Record<string, unknown> = {}
): WorkflowLookupItem => ({
  id,
  name: id,
  enabled: true,
  definition: { name: id, triggers: [{ type: 'manual' }], steps, ...extra },
});

const triage = workflow('triage', [
  callStep('ctx', { inputs: { alert_id: '{{ event.alerts[0].id }}' } }),
  { name: 'log', type: 'console', with: { message: '{{ steps.ctx.output.severity }}' } },
]);

const enrich = workflow('enrich', [
  {
    name: 'maybe',
    type: 'if',
    condition: 'true',
    steps: [callStep('lookup', { inputs: { alert_id: 'abc', depth: 'deep' } })],
  },
  { name: 'use', type: 'console', with: { message: "{{ steps['lookup'].output['score'] }}" } },
]);

const fanout = workflow('fanout', [
  callStep('fire', { inputs: '${{ inputs.payload }}' }, 'workflow.executeAsync'),
]);

const alreadyBroken = workflow('already-broken', [callStep('ctx', { inputs: {} })]);

const nightly = workflow('nightly', [
  { name: 'run-triage', type: 'workflow.execute', with: { 'workflow-id': 'triage' } },
]);

describe('collectWorkflowCallSites', () => {
  it('finds calls nested in control-flow steps and skips dynamic workflow ids', () => {
    const callSites = collectWorkflowCallSites({
      steps: [
        { name: 'a', type: 'workflow.execute', with: { 'workflow-id': '{{ inputs.id }}' } },
        {
          name: 'sw',
          type: 'switch',
          cases: [{ match: 1, steps: [callStep('b', {})] }],
          default: [callStep('c', {}, 'workflow.executeAsync')],
        },
      ],
    });
    expect(callSites.map(({ stepName, stepType }) => [stepName, stepType])).toEqual([
      ['b', 'workflow.execute'],
      ['c', 'workflow.executeAsync'],
    ]);
  });

  it('skips the malformed parts of a draft being typed', () => {
    expect(
      collectWorkflowCallSites({
        steps: [
          { name: 'half', type: 'switch' },
          { name: 'sw', type: 'switch', cases: [null, { steps: [callStep('b', {})] }] },
        ],
      }).map(({ stepName }) => stepName)
    ).toEqual(['b']);
  });

  it('finds calls in the workflow-level fallback', () => {
    expect(
      collectWorkflowCallSites({
        settings: { 'on-failure': { fallback: [callStep('on-workflow-failure', {})] } },
        steps: [callStep('always', {})],
      }).map(({ stepName }) => stepName)
    ).toEqual(['always', 'on-workflow-failure']);
  });
});

describe('findOutputUsages', () => {
  it('detects dot and bracket notation and whole-output references', () => {
    const definition = {
      steps: [
        {
          name: 'x',
          type: 'console',
          with: {
            a: '{{ steps.ctx.output.severity }}',
            b: '{{ steps["ctx"].output["score"] }}',
            c: '{{ steps.ctx.output | json }}',
            d: '{{ steps.ctx2.output.other }}',
          },
        },
      ],
    };
    expect(
      findOutputUsages(definition, 'ctx')
        .map(({ field }) => field)
        .sort()
    ).toEqual(['', 'score', 'severity']);
  });

  it('finds reads in on-failure continue conditions', () => {
    const definition = {
      steps: [
        { ...callStep('ctx', {}) },
        {
          name: 'next',
          type: 'console',
          with: { message: 'hi' },
          'on-failure': { continue: 'steps.ctx.output.severity : "high"' },
        },
        {
          name: 'again',
          type: 'console',
          with: { message: 'hi' },
          'on-failure': { retry: { 'max-attempts': 2, condition: 'steps.ctx.output.retry : *' } },
        },
      ],
      settings: { 'on-failure': { continue: 'steps.ctx.output.ignored : *' } },
    };

    expect(findOutputUsages(definition, 'ctx').map(({ field }) => field)).toEqual([
      'ignored',
      'severity',
      'retry',
    ]);
  });

  it('finds reads in iteration-on-failure conditions', () => {
    const definition = {
      steps: [
        { ...callStep('ctx', {}) },
        {
          name: 'each',
          type: 'foreach',
          foreach: '[1, 2]',
          'iteration-on-failure': {
            continue: 'steps.ctx.output.skip : *',
            retry: { 'max-attempts': 2, condition: 'steps.ctx.output.retry : *' },
          },
          steps: [{ name: 'log', type: 'console', with: { message: 'hi' } }],
        },
      ],
    };

    expect(findOutputUsages(definition, 'ctx').map(({ field }) => field)).toEqual([
      'skip',
      'retry',
    ]);
  });

  it('reads KQL only where the engine evaluates a condition, not in step payloads', () => {
    const definition = {
      steps: [
        {
          name: 'post',
          type: 'http',
          with: { condition: 'steps.ctx.output.value: *', if: 'steps.ctx.output.other: *' },
        },
        { name: 'loop', type: 'foreach', foreach: '[1]', condition: 'steps.ctx.output.x: *' },
      ],
    };

    expect(findOutputUsages(definition, 'ctx')).toEqual([]);
  });

  it('treats a read as covered only when every reference has a default filter', () => {
    const usages = findOutputUsages(
      {
        steps: [
          {
            name: 'x',
            type: 'console',
            with: {
              a: '{{ steps.ctx.output.score | default: 0 }}',
              b: '{{ steps.ctx.output.severity | default: "low" }}',
              c: 'Severity: {{ steps.ctx.output.severity }}',
              d: "{% if true %}{{ steps.ctx.output.value | default: 'safe' }}{% endif %}",
              e: '{% for i in (1..2) %}{% if i %}{{ steps.ctx.output.rank | default: 1 }}{% endif %}{% endfor %}',
              f: '{% if steps.ctx.output.flag %}{{ steps.ctx.output.flag | default: 0 }}{% endif %}',
            },
          },
        ],
      },
      'ctx'
    );
    expect(usages).toEqual([
      { field: 'score', hasFallback: true },
      { field: 'severity', hasFallback: false },
      { field: 'value', hasFallback: true },
      { field: 'rank', hasFallback: true },
      { field: 'flag', hasFallback: false },
    ]);
  });

  it('reads Liquid tags, KQL conditions and the workflow-level fallback, but not plain text', () => {
    const usages = findOutputUsages(
      {
        settings: {
          'on-failure': {
            fallback: [
              { name: 'f', type: 'console', with: { m: '{{ steps.ctx.output.recovery }}' } },
            ],
          },
        },
        steps: [
          {
            name: 'x',
            type: 'console',
            if: 'steps.ctx.output.enabled : true',
            with: {
              a: "{{ steps['ctx']['output']['bracketed'] }}",
              b: '{% if steps.ctx.output.flag %}yes{% endif %}',
              c: '{% for item in steps.ctx.output.items %}{{ item.name }}{% endfor %}',
              d: 'See steps.ctx.output.documented in the docs',
            },
          },
          { name: 'branch', type: 'if', condition: 'steps.ctx.output.level : "high"', steps: [] },
        ],
      },
      'ctx'
    );

    expect(usages.map(({ field }) => field).sort()).toEqual([
      'bracketed',
      'enabled',
      'flag',
      'items',
      'level',
      'recovery',
    ]);
    expect(usages.every(({ hasFallback }) => !hasFallback)).toBe(true);
  });
});

describe('mayRecoverFromFailure', () => {
  const run = (name: string, extra: Record<string, unknown> = {}) => ({
    ...callStep(name, {}),
    ...extra,
  });

  it('reads the step’s own on-failure', () => {
    const definition = {
      steps: [
        run('plain'),
        run('continues', { 'on-failure': { continue: true } }),
        run('maybe-continues', { 'on-failure': { continue: 'inputs.lenient : true' } }),
        run('strict', { 'on-failure': { continue: false } }),
        run('falls-back', { 'on-failure': { fallback: [{ name: 'log', type: 'console' }] } }),
        run('ends-in-fallback', {
          'on-failure': { fallback: [{ name: 'done', type: 'workflow.output', with: {} }] },
        }),
        run('fails-in-fallback', {
          'on-failure': { fallback: [{ name: 'stop', type: 'workflow.fail', with: {} }] },
        }),
        run('retries', { 'on-failure': { retry: { 'max-attempts': 2 } } }),
      ],
    };
    const recovers = (stepName: string) => mayRecoverFromFailure(definition, stepName);

    expect(recovers('plain')).toBe(false);
    expect(recovers('continues')).toBe(true);
    expect(recovers('maybe-continues')).toBe(true);
    expect(recovers('strict')).toBe(false);
    // The engine fails the step again after its fallback, unless the fallback completed the run.
    expect(recovers('falls-back')).toBe(false);
    expect(recovers('ends-in-fallback')).toBe(true);
    expect(recovers('fails-in-fallback')).toBe(false);
    expect(recovers('retries')).toBe(false);
    expect(recovers('missing')).toBe(false);
  });

  it('counts loop control in a fallback only when it leaves the loop around the step', () => {
    const innerLoop = (name: string, type: string, extra: Record<string, unknown> = {}) => ({
      name,
      type: 'foreach',
      foreach: '[1]',
      steps: [{ name: `${name}-leave`, type }],
      ...extra,
    });
    const definition = {
      steps: [
        {
          name: 'outer',
          type: 'foreach',
          foreach: '[1, 2]',
          steps: [
            run('breaks', { 'on-failure': { fallback: [{ name: 'leave', type: 'loop.break' }] } }),
            ...['loop.break', 'loop.continue'].map((type) =>
              run(`in-inner-${type}`, { 'on-failure': { fallback: [innerLoop('inner', type)] } })
            ),
            run('in-inner-iteration-fallback', {
              'on-failure': {
                fallback: [
                  {
                    ...innerLoop('inner', 'console'),
                    'iteration-on-failure': { fallback: [{ name: 'leave', type: 'loop.break' }] },
                  },
                ],
              },
            }),
            run('in-inner-loop-fallback', {
              'on-failure': {
                fallback: [
                  {
                    ...innerLoop('inner', 'console'),
                    'on-failure': { fallback: [{ name: 'leave', type: 'loop.continue' }] },
                  },
                ],
              },
            }),
            run('ends-in-inner', {
              'on-failure': {
                fallback: [
                  innerLoop('inner', 'console', {
                    steps: [{ name: 'done', type: 'workflow.output', with: {} }],
                  }),
                ],
              },
            }),
          ],
        },
      ],
    };
    const recovers = (stepName: string) => mayRecoverFromFailure(definition, stepName);

    expect(recovers('breaks')).toBe(true);
    expect(recovers('in-inner-loop.break')).toBe(false);
    expect(recovers('in-inner-loop.continue')).toBe(false);
    expect(recovers('in-inner-iteration-fallback')).toBe(false);
    // A loop's own on-failure runs outside it, so its loop control leaves the outer loop.
    expect(recovers('in-inner-loop-fallback')).toBe(true);
    expect(recovers('ends-in-inner')).toBe(true);
  });

  it('reads the handlers of the steps that hold it, and the continue around a fallback', () => {
    const done = { name: 'done', type: 'workflow.output', with: {} };
    const definition = {
      steps: [
        {
          name: 'guarded',
          type: 'if',
          condition: 'true',
          'on-failure': { fallback: [run('in-fallback'), done] },
          steps: [run('inside')],
        },
        run('continues', { 'on-failure': { continue: true, fallback: [run('in-continued')] } }),
        {
          name: 'iterations',
          type: 'foreach',
          foreach: '[1]',
          'on-failure': { continue: true },
          'iteration-on-failure': { fallback: [run('in-iteration-fallback')] },
          steps: [run('body')],
        },
        {
          name: 'loop',
          type: 'foreach',
          foreach: '[1]',
          'iteration-on-failure': { continue: true },
          steps: [run('iteration')],
        },
        {
          name: 'fan',
          type: 'parallel',
          mode: 'settled',
          branches: [{ name: 'one', steps: [run('branch')] }],
        },
        {
          name: 'fail-fast',
          type: 'parallel',
          branches: [{ name: 'one', steps: [run('fast-branch')] }],
        },
      ],
    };
    const recovers = (stepName: string) => mayRecoverFromFailure(definition, stepName);

    expect(recovers('inside')).toBe(true);
    expect(recovers('in-fallback')).toBe(false);
    expect(recovers('in-continued')).toBe(true);
    expect(recovers('in-iteration-fallback')).toBe(true);
    expect(recovers('iteration')).toBe(true);
    expect(recovers('branch')).toBe(true);
    expect(recovers('fast-branch')).toBe(false);
  });

  it('applies the workflow-level handler to steps without their own, and its fallback', () => {
    const definition = {
      settings: { 'on-failure': { continue: true, fallback: [run('in-fallback')] } },
      steps: [run('plain'), run('strict', { 'on-failure': { continue: false } })],
    };
    const recovers = (stepName: string) => mayRecoverFromFailure(definition, stepName);

    expect(recovers('plain')).toBe(true);
    expect(recovers('strict')).toBe(false);
    expect(recovers('in-fallback')).toBe(true);
    expect(
      mayRecoverFromFailure(
        { settings: { 'on-failure': { fallback: [run('in-fallback')] } }, steps: [] },
        'in-fallback'
      )
    ).toBe(false);
  });
});

describe('findOutputsPassingThrough', () => {
  it('returns the workflow outputs whose values come from the given step outputs', () => {
    const definition = {
      steps: [
        callStep('ctx', {}),
        {
          name: 'out',
          type: 'workflow.output',
          with: {
            risk: '${{ steps.ctx.output.score }}',
            label: '{{ steps.ctx.output.severity }}',
            safe: '{{ steps.ctx.output.score | default: 0 }}',
            whole: '${{ steps.ctx.output }}',
          },
        },
      ],
    };
    const blocks = collectWorkflowOutputBlocks(definition);
    expect([...findOutputsPassingThrough(blocks, [{ stepName: 'ctx', field: 'score' }])]).toEqual([
      'risk',
      'whole',
    ]);
    expect([...findOutputsPassingThrough(blocks, [{ stepName: 'ctx' }])].sort()).toEqual([
      'label',
      'risk',
      'whole',
    ]);
  });
});

describe('mayLoseImplicitOutput', () => {
  const reads = [{ stepName: 'ctx' }];
  const ctx = callStep('ctx', {});

  it('is true when the last step is the step, holds it, or reads it without a fallback', () => {
    const lastStep = (step: Record<string, unknown>) => ({ steps: [ctx, step] });

    expect(mayLoseImplicitOutput({ steps: [ctx] }, reads)).toBe(true);
    expect(
      mayLoseImplicitOutput(
        { steps: [{ name: 'if', type: 'if', condition: 'true', steps: [ctx] }] },
        reads
      )
    ).toBe(true);
    expect(
      mayLoseImplicitOutput(
        lastStep({ name: 'keep', type: 'data.set', with: { v: '{{ steps.ctx.output.v }}' } }),
        reads
      )
    ).toBe(true);
    expect(
      mayLoseImplicitOutput(
        lastStep({
          name: 'keep',
          type: 'data.set',
          with: { v: '{{ steps.ctx.output.v | default: 1 }}' },
        }),
        reads
      )
    ).toBe(false);
    expect(mayLoseImplicitOutput(lastStep({ name: 'log', type: 'console' }), reads)).toBe(false);
  });

  it('is false when every run that reaches the end returns a workflow.output', () => {
    const output = {
      name: 'out',
      type: 'workflow.output',
      with: { v: '{{ steps.ctx.output.v }}' },
    };

    expect(mayLoseImplicitOutput({ steps: [ctx, output] }, reads)).toBe(false);
    expect(mayLoseImplicitOutput({ steps: [ctx, { ...output, if: 'true' }] }, reads)).toBe(true);
  });
});

describe('analyzeRemovalImpact', () => {
  it('lists enabled callers and counts the workflows further up that fail', () => {
    const impact = analyzeRemovalImpact(
      [CHILD_ID],
      [triage, enrich, fanout, nightly, { ...alreadyBroken, enabled: false }]
    );

    expect(impact.callers.map(({ id }) => id)).toEqual(['enrich', 'fanout', 'triage']);
    expect(impact.indirect).toBe(1);
  });

  it('fails callers whose own on-failure overrides a workflow-level continue', () => {
    const strictStep = workflow(
      'strict-step',
      [{ ...callStep('ctx', { inputs: { alert_id: 'a' } }), 'on-failure': { continue: false } }],
      { settings: { 'on-failure': { continue: true } } }
    );
    const top = workflow('top', [callStep('run', {}, undefined, 'strict-step')]);

    expect(analyzeRemovalImpact([CHILD_ID], [strictStep, top]).indirect).toBe(1);
  });

  it('takes a caller that might recover to keep running without the step’s outputs', () => {
    const recovering = workflow('recovering', [
      {
        ...callStep('ctx', { inputs: { alert_id: 'a' } }),
        'on-failure': { continue: true },
      },
      {
        name: 'emit',
        type: 'workflow.output',
        with: { severity: '${{ steps.ctx.output.severity }}' },
      },
    ]);
    const reads = workflow('reads', [
      callStep('run', {}, undefined, 'recovering'),
      { name: 'log', type: 'console', with: { m: '{{ steps.run.output.severity }}' } },
    ]);
    const ignores = workflow('ignores', [callStep('run', {}, undefined, 'recovering')]);

    expect(analyzeRemovalImpact([CHILD_ID], [recovering, reads, ignores]).indirect).toBe(1);
  });

  it('fails callers whose fallback goes on, since the engine fails the step after it', () => {
    const fallingBack = workflow('falling-back', [
      {
        ...callStep('ctx', { inputs: { alert_id: 'a' } }),
        'on-failure': { fallback: [{ name: 'log', type: 'console' }] },
      },
    ]);
    const top = workflow('top', [callStep('run', {}, undefined, 'falling-back')]);

    expect(analyzeRemovalImpact([CHILD_ID], [fallingBack, top]).indirect).toBe(1);
  });

  it.each(['loop.break', 'loop.continue'])(
    'fails callers whose fallback runs %s in a loop of its own, which leaves only that loop',
    (type) => {
      const fallingBack = workflow('falling-back', [
        {
          ...callStep('ctx', {}),
          'on-failure': {
            fallback: [
              { name: 'inner', type: 'foreach', foreach: '[1]', steps: [{ name: 'leave', type }] },
            ],
          },
        },
      ]);
      const top = workflow('top', [callStep('run', {}, undefined, 'falling-back')]);

      expect(analyzeRemovalImpact([CHILD_ID], [fallingBack, top]).indirect).toBe(1);
    }
  );

  it('follows outputs a caller returns without a workflow.output step, from its last step', () => {
    const forwards = workflow('forwards', [
      { ...callStep('ctx', {}), 'on-failure': { continue: true } },
      { name: 'keep', type: 'data.set', with: { value: '${{ steps.ctx.output.value }}' } },
    ]);
    const endsInCall = workflow('ends-in-call', [
      { ...callStep('ctx', {}), 'on-failure': { continue: true } },
    ]);
    const readsOutput = (calledId: string) =>
      workflow(`reads-${calledId}`, [
        callStep('run', {}, undefined, calledId),
        { name: 'emit', type: 'workflow.output', with: { value: '${{ steps.run.output.value }}' } },
      ]);

    expect(analyzeRemovalImpact([CHILD_ID], [forwards, readsOutput('forwards')]).indirect).toBe(1);
    expect(
      analyzeRemovalImpact([CHILD_ID], [endsInCall, readsOutput('ends-in-call')]).indirect
    ).toBe(1);
  });

  it('ignores calls between workflows that are removed together', () => {
    const impact = analyzeRemovalImpact([CHILD_ID, 'triage'], [triage, nightly]);

    expect(impact.callers.map(({ id }) => id)).toEqual(['nightly']);
    expect(impact.indirect).toBe(0);
  });

  it('doesn’t follow callers that run a failing caller in the background', () => {
    const background = workflow('background', [
      callStep('run', {}, 'workflow.executeAsync', 'triage'),
    ]);

    expect(analyzeRemovalImpact([CHILD_ID], [triage, background]).indirect).toBe(0);
  });

  it('doesn’t count unmanaged workflows above a managed caller, since they can’t run it', () => {
    const managedCaller = { ...triage, managed: true };
    const runTriage = callStep('run', {}, undefined, 'triage');
    const unmanagedTop = workflow('top', [runTriage]);
    const managedTop = { ...workflow('managed-top', [runTriage]), managed: true };

    expect(analyzeRemovalImpact([CHILD_ID], [managedCaller, unmanagedTop]).indirect).toBe(0);
    expect(analyzeRemovalImpact([CHILD_ID], [managedCaller, managedTop]).indirect).toBe(1);
  });
});
