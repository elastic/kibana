/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  analyzeCalledWorkflows,
  analyzeDependents,
  analyzeRemovalImpact,
  buildDependentsIndex,
  MAX_INDIRECT_DEPTH,
} from './analyze_dependents';
import {
  collectWorkflowCallSites,
  findOutputsPassingThrough,
  findOutputUsages,
} from './find_call_sites';
import type { DependentsAnalysis, ImpactIssue, WorkflowLookupItem } from './types';

const CHILD_ID = 'alert-context';

const makeChild = ({
  inputs = [
    { name: 'alert_id', type: 'string', required: true },
    { name: 'depth', type: 'number', default: 1 },
  ],
  outputs = [
    { name: 'severity', type: 'string' },
    { name: 'score', type: 'number' },
  ],
  emit = { severity: 'high', score: 9 },
}: {
  inputs?: Array<Record<string, unknown>>;
  outputs?: Array<Record<string, unknown>>;
  emit?: Record<string, unknown>;
} = {}) => ({
  name: 'Alert context',
  triggers: [{ type: 'manual', inputs }],
  outputs,
  steps: [{ name: 'emit', type: 'workflow.output', with: emit }],
});

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
  callStep('fire', { inputs: '{{ inputs.payload }}' }, 'workflow.executeAsync'),
]);

const alreadyBroken = workflow('already-broken', [callStep('ctx', { inputs: {} })]);

const nightly = workflow('nightly', [
  { name: 'run-triage', type: 'workflow.execute', with: { 'workflow-id': 'triage' } },
]);

const unrelated = workflow('unrelated', [{ name: 'noop', type: 'console', with: {} }]);

const childItem = { id: CHILD_ID, name: 'Alert context', enabled: true, definition: makeChild() };

const allWorkflows = [triage, enrich, fanout, alreadyBroken, nightly, unrelated, childItem];

const index = buildDependentsIndex(CHILD_ID, allWorkflows);

const analyze = (draftDefinition: unknown) =>
  analyzeDependents({ index, savedDefinition: makeChild(), draftDefinition });

const analyzeWith = (
  workflows: WorkflowLookupItem[],
  draftDefinition: unknown,
  savedDefinition: unknown = makeChild()
) =>
  analyzeDependents({
    index: buildDependentsIndex(CHILD_ID, workflows),
    savedDefinition,
    draftDefinition,
  });

const statusById = (analysis: DependentsAnalysis) =>
  Object.fromEntries(analysis.dependents.map(({ workflowId, status }) => [workflowId, status]));

const dependentOf = (analysis: DependentsAnalysis, id: string) =>
  analysis.dependents.find(({ workflowId }) => workflowId === id);

const kinds = (issues: readonly ImpactIssue[] = []) =>
  issues.map(({ kind, severity }) => `${kind}:${severity}`);

// Removing the `severity` output breaks every workflow that reads it.
const withoutSeverity = makeChild({
  outputs: [{ name: 'score', type: 'number' }],
  emit: { score: 9 },
});

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

  it('knows which calls an on-failure continue covers', () => {
    const contained = (definition: unknown) =>
      Object.fromEntries(
        collectWorkflowCallSites(definition).map(({ stepName, continuesOnFailure }) => [
          stepName,
          continuesOnFailure,
        ])
      );

    expect(
      contained({
        steps: [
          callStep('plain', {}),
          { ...callStep('own', {}), 'on-failure': { continue: true } },
          { ...callStep('fallback-only', {}), 'on-failure': { fallback: [{ name: 'f' }] } },
          {
            name: 'wrap',
            type: 'if',
            'on-failure': { continue: true },
            steps: [callStep('inside', {})],
          },
          {
            name: 'loop',
            type: 'foreach',
            'iteration-on-failure': { continue: true },
            steps: [callStep('iteration', {})],
          },
        ],
      })
    ).toEqual({
      plain: false,
      own: true,
      'fallback-only': false,
      inside: true,
      iteration: true,
    });
    expect(
      contained({ settings: { 'on-failure': { continue: true } }, steps: [callStep('any', {})] })
    ).toEqual({ any: true });
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
            },
          },
        ],
      },
      'ctx'
    );
    expect(usages).toEqual([
      { field: 'score', hasFallback: true },
      { field: 'severity', hasFallback: false },
    ]);
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
    expect([
      ...findOutputsPassingThrough(definition, [{ stepName: 'ctx', field: 'score' }]),
    ]).toEqual(['risk', 'whole']);
    expect([...findOutputsPassingThrough(definition, [{ stepName: 'ctx' }])].sort()).toEqual([
      'label',
      'risk',
      'whole',
    ]);
  });
});

describe('analyzeDependents', () => {
  it('lists direct callers with no impact when nothing changed', () => {
    const analysis = analyze(makeChild());

    expect(analysis.contractChanges).toEqual([]);
    expect(analysis.summary).toEqual({ direct: 4, breaking: 0, warning: 0, indirectBreaking: 0 });
    expect(analysis.dependents.every(({ upstream }) => upstream.length === 0)).toBe(true);
  });

  it('marks callers the saved version already breaks as already broken', () => {
    const brokenDependent = dependentOf(analyze(makeChild()), 'already-broken');

    expect(brokenDependent?.status).toBe('alreadyBroken');
    expect(brokenDependent?.issues).toEqual([
      expect.objectContaining({ kind: 'missingRequiredInput', field: 'alert_id', isNew: false }),
    ]);
  });

  it('flags callers that read a removed output', () => {
    const analysis = analyze(withoutSeverity);

    expect(analysis.contractChanges).toEqual([
      expect.objectContaining({ kind: 'outputRemoved', field: 'severity', severity: 'breaking' }),
    ]);
    expect(statusById(analysis)).toMatchObject({ triage: 'breaking', enrich: 'alreadyBroken' });
  });

  it('flags callers that read a declared output the workflow.output step no longer sets', () => {
    const draft = {
      ...makeChild(),
      steps: [{ name: 'emit', type: 'workflow.output', with: { severity: 'high', scor: 9 } }],
    };
    const analysis = analyze(draft);

    expect(analysis.contractChanges).toEqual([
      expect.objectContaining({ kind: 'outputNoLongerReturned', field: 'score' }),
    ]);
    expect(statusById(analysis)).toMatchObject({ triage: 'safe', enrich: 'breaking' });
    expect(dependentOf(analysis, 'enrich')?.issues).toContainEqual(
      expect.objectContaining({ kind: 'unreturnedOutput', field: 'score' })
    );
  });

  it('only warns when the workflow.output step still sets an output that is no longer declared', () => {
    const analysis = analyze(makeChild({ outputs: [{ name: 'score', type: 'number' }] }));

    expect(analysis.contractChanges).toEqual([
      expect.objectContaining({ kind: 'outputRemoved', field: 'severity', severity: 'warning' }),
    ]);
    expect(kinds(dependentOf(analysis, 'triage')?.issues)).toEqual([
      'outputNoLongerDeclared:warning',
    ]);
    expect(analysis.summary.breaking).toBe(0);
  });

  it('warns callers that read outputs when no workflow.output step is left', () => {
    const analysis = analyze({
      ...makeChild(),
      steps: [{ name: 'log', type: 'console', with: { message: 'done' } }],
    });

    expect(analysis.contractChanges).toEqual([
      expect.objectContaining({ kind: 'outputStepRemoved', severity: 'warning' }),
    ]);
    expect(statusById(analysis).triage).toBe('warning');
    expect(dependentOf(analysis, 'triage')?.issues).toEqual([
      expect.objectContaining({ kind: 'outputFromLastStep', field: 'severity', isNew: true }),
    ]);
  });

  it('only warns when the removed output is read with a default value', () => {
    const reader = workflow('reader', [
      callStep('ctx', { inputs: { alert_id: 'a' } }),
      {
        name: 'log',
        type: 'console',
        with: { m: '{{ steps.ctx.output.severity | default: "-" }}' },
      },
    ]);
    const analysis = analyzeWith([reader], withoutSeverity);

    expect(kinds(dependentOf(analysis, 'reader')?.issues)).toEqual(['removedOutput:warning']);
  });

  it('breaks every caller when the workflow is turned off', () => {
    const analysis = analyze({ ...makeChild(), enabled: false });

    expect(analysis.contractChanges).toEqual([
      expect.objectContaining({ kind: 'disabled', severity: 'breaking' }),
    ]);
    expect(Object.values(statusById(analysis))).toEqual([
      'breaking',
      'breaking',
      'breaking',
      'breaking',
    ]);
  });

  it('flags every static caller when a new required input is added', () => {
    const analysis = analyze(
      makeChild({
        inputs: [
          { name: 'alert_id', type: 'string', required: true },
          { name: 'depth', type: 'number', default: 1 },
          { name: 'tenant', type: 'string', required: true },
        ],
      })
    );

    expect(statusById(analysis)).toEqual({
      triage: 'breaking',
      enrich: 'breaking',
      'already-broken': 'breaking',
      fanout: 'unknown',
    });
  });

  it('flags values that no longer match the input type, including text templates', () => {
    const analysis = analyze(
      makeChild({
        inputs: [
          { name: 'alert_id', type: 'number', required: true },
          { name: 'depth', type: 'number', default: 1 },
        ],
      })
    );

    expect(dependentOf(analysis, 'enrich')?.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kind: 'inputTypeMismatch', field: 'alert_id', isNew: true }),
        expect.objectContaining({ kind: 'inputTypeMismatch', field: 'depth', isNew: false }),
      ])
    );
    // `{{ }}` always renders a string, which a number input rejects.
    expect(dependentOf(analysis, 'triage')?.issues).toEqual([
      expect.objectContaining({ kind: 'inputRendersAsText', severity: 'breaking', isNew: true }),
    ]);
  });

  it('warns when a passed input is no longer declared', () => {
    const analysis = analyze(
      makeChild({ inputs: [{ name: 'alert_id', type: 'string', required: true }] })
    );

    expect(statusById(analysis).enrich).toBe('warning');
    expect(analysis.contractChanges).toEqual([
      expect.objectContaining({ kind: 'inputRemoved', field: 'depth', severity: 'warning' }),
    ]);
  });

  describe('typing', () => {
    const childWithInputs = (properties: Record<string, unknown>, extra = {}) => ({
      ...makeChild(),
      inputs: { properties, ...extra },
      triggers: [{ type: 'manual' }],
    });
    const typedCaller = (inputs: Record<string, unknown>, callerExtra = {}) =>
      workflow('caller', [callStep('ctx', { inputs })], callerExtra);
    const issuesFor = (
      inputs: Record<string, unknown>,
      draft: unknown,
      saved: unknown = draft,
      callerExtra = {}
    ) =>
      kinds(
        dependentOf(analyzeWith([typedCaller(inputs, callerExtra)], draft, saved), 'caller')?.issues
      );

    it('breaks a literal string sent to an input that became an array', () => {
      const saved = childWithInputs({ tags: { type: 'string' } });
      const draft = childWithInputs({ tags: { type: 'array', items: { type: 'string' } } });
      expect(issuesFor({ tags: 'urgent' }, draft, saved)).toEqual(['inputTypeMismatch:breaking']);
      expect(issuesFor({ tags: ['urgent'] }, draft, saved)).toEqual([]);
    });

    it('checks array items, nested objects, enums and integers like the run does', () => {
      const draft = childWithInputs({
        tags: { type: 'array', items: { type: 'string' } },
        target: {
          type: 'object',
          properties: { host: { type: 'string' } },
          required: ['host'],
        },
        level: { type: 'string', enum: ['low', 'high'] },
        count: { type: 'integer' },
      });

      expect(issuesFor({ tags: [1] }, draft)).toEqual(['inputValueRejected:breaking']);
      expect(issuesFor({ target: {} }, draft)).toEqual(['inputValueRejected:breaking']);
      expect(issuesFor({ level: 'medium' }, draft)).toEqual(['inputValueRejected:breaking']);
      expect(issuesFor({ count: 1.5 }, draft)).toEqual(['inputTypeMismatch:breaking']);
      expect(issuesFor({ count: 2, level: 'low', target: { host: 'a' } }, draft)).toEqual([]);
      // Nested values computed while running can't be judged.
      expect(issuesFor({ target: { host: '${{ inputs.host }}' } }, draft)).toEqual([]);
    });

    it('treats {{ }} as text and ${{ }} as typed', () => {
      const draft = childWithInputs({
        count: { type: 'number' },
        note: { type: ['string', 'null'] },
      });

      expect(issuesFor({ count: '{{ inputs.n }}' }, draft)).toEqual([
        'inputRendersAsText:breaking',
      ]);
      expect(issuesFor({ count: '${{ steps.x.output.n }}' }, draft)).toEqual([]);
      expect(issuesFor({ note: '{{ inputs.n }}' }, draft)).toEqual([]);
    });

    it('compares ${{ inputs.x }} with the type the caller declares for x', () => {
      const draft = childWithInputs({
        ids: { type: 'array' },
        n: { type: 'number' },
        s: { type: 'string' },
      });
      const callerInputs = {
        inputs: {
          properties: {
            id: { type: 'string' },
            whole: { type: 'integer' },
            maybe: { type: ['string', 'null'] },
          },
        },
      };

      expect(issuesFor({ ids: '${{ inputs.id }}' }, draft, draft, callerInputs)).toEqual([
        'inputTypeMismatch:breaking',
      ]);
      expect(issuesFor({ n: '${{ inputs.whole }}' }, draft, draft, callerInputs)).toEqual([]);
      expect(issuesFor({ s: '${{ inputs.maybe }}' }, draft, draft, callerInputs)).toEqual([
        'inputTypeMismatch:warning',
      ]);
    });

    it('resolves ${{ consts.x }} to the constant', () => {
      const draft = childWithInputs({ limit: { type: 'number' } });
      expect(
        issuesFor({ limit: '${{ consts.limit }}' }, draft, draft, { consts: { limit: 'ten' } })
      ).toEqual(['inputTypeMismatch:breaking']);
      expect(
        issuesFor({ limit: '${{ consts.limit }}' }, draft, draft, { consts: { limit: 10 } })
      ).toEqual([]);
    });

    it('only warns about values computed while running when the input accepts less', () => {
      const asInteger = childWithInputs({ n: { type: 'integer' } });
      const asNumber = childWithInputs({ n: { type: 'number' } });
      const computed = { n: '${{ steps.x.output.n }}' };

      expect(issuesFor(computed, asNumber, asInteger)).toEqual([]);
      expect(issuesFor(computed, asInteger, asNumber)).toEqual(['inputTypeChanged:warning']);
      expect(analyzeWith([typedCaller(computed)], asNumber, asInteger).contractChanges).toEqual([
        expect.objectContaining({ kind: 'inputTypeChanged', severity: 'info' }),
      ]);
    });

    it('flags enum values that are no longer allowed', () => {
      const saved = childWithInputs({ level: { type: 'string', enum: ['low', 'mid', 'high'] } });
      const draft = childWithInputs({ level: { type: 'string', enum: ['low', 'high'] } });

      expect(issuesFor({ level: 'mid' }, draft, saved)).toEqual(['inputValueRejected:breaking']);
      expect(issuesFor({ level: '${{ inputs.level }}' }, draft, saved)).toEqual([
        'inputAllowedValuesChanged:warning',
      ]);
      expect(issuesFor({ level: 'low' }, draft, saved)).toEqual([]);
    });

    it('breaks unknown inputs only when the schema rejects them', () => {
      const lenient = childWithInputs({ a: { type: 'string' } });
      const strict = childWithInputs({ a: { type: 'string' } }, { additionalProperties: false });

      expect(issuesFor({ a: 'x', extra: 1 }, lenient)).toEqual(['unknownInput:warning']);
      expect(issuesFor({ a: 'x', extra: 1 }, strict, lenient)).toEqual(['unknownInput:breaking']);
    });

    it('counts a problem that turns from a warning into a break as new', () => {
      const lenient = childWithInputs({ a: { type: 'string' } });
      const strict = childWithInputs({ a: { type: 'string' } }, { additionalProperties: false });
      const caller = typedCaller({ a: 'x', extra: 1 });

      const stricter = analyzeWith([caller], strict, lenient);
      expect(dependentOf(stricter, 'caller')).toMatchObject({
        status: 'breaking',
        issues: [expect.objectContaining({ kind: 'unknownInput', isNew: true })],
      });
      expect(stricter.summary.breaking).toBe(1);

      const looser = analyzeWith([caller], lenient, strict);
      expect(dependentOf(looser, 'caller')).toMatchObject({
        status: 'safe',
        issues: [expect.objectContaining({ kind: 'unknownInput', isNew: false })],
      });
    });

    it('only warns about output type changes that widen what callers get', () => {
      const reader = workflow('reader', [
        callStep('ctx', { inputs: { alert_id: 'a' } }),
        { name: 'log', type: 'console', with: { m: '{{ steps.ctx.output.score }}' } },
      ]);
      const asNumber = makeChild({ outputs: [{ name: 'score', type: 'number' }] });
      const asNumberOrNull = makeChild({ outputs: [{ name: 'score', type: ['number', 'null'] }] });

      expect(
        kinds(dependentOf(analyzeWith([reader], asNumberOrNull, asNumber), 'reader')?.issues)
      ).toEqual(['outputTypeChanged:warning']);
      expect(
        kinds(dependentOf(analyzeWith([reader], asNumber, asNumberOrNull), 'reader')?.issues)
      ).toEqual([]);
    });
  });

  describe('callers further up the chain', () => {
    // `b` reads the severity output; removing it breaks `b` without failing it.
    const readsSeverity = workflow('b', [
      callStep('ctx', { inputs: { alert_id: 'a' } }),
      { name: 'log', type: 'console', with: { m: '{{ steps.ctx.output.severity }}' } },
      {
        name: 'out',
        type: 'workflow.output',
        with: { label: '{{ steps.ctx.output.severity }}', other: 'fixed' },
      },
    ]);
    // `f` misses the required input once it's added, so the step fails.
    const failsOnNewInput = workflow('f', [callStep('ctx', { inputs: { alert_id: 'a' } })]);
    const withTenant = makeChild({
      inputs: [
        { name: 'alert_id', type: 'string', required: true },
        { name: 'tenant', type: 'string', required: true },
      ],
    });
    const runs = (id: string, target: string, extra: Record<string, unknown> = {}, type?: string) =>
      workflow(id, [{ ...callStep(`run-${target}`, {}, type, target), ...extra }]);
    const upstreamOf = (analysis: DependentsAnalysis, id: string) =>
      dependentOf(analysis, id)?.upstream.map(({ workflowId, effect, field }) =>
        [workflowId, effect, field].filter(Boolean).join(':')
      );

    it('fails grandparents that wait for a failing caller, but not background or continuing ones', () => {
      const analysis = analyzeWith(
        [
          failsOnNewInput,
          runs('waits', 'f'),
          runs('background', 'f', {}, 'workflow.executeAsync'),
          runs('continues', 'f', { 'on-failure': { continue: true } }),
          runs('grandparent', 'waits'),
        ],
        withTenant
      );

      expect(upstreamOf(analysis, 'f')).toEqual([
        'waits:fails',
        'continues:missingOutput',
        'grandparent:fails',
      ]);
      expect(analysis.summary.indirectBreaking).toBe(3);
    });

    it('follows outputs passed on through workflow.output to the workflows that read them', () => {
      const readsLabel = workflow('reads-label', [
        callStep('b', {}, undefined, 'b'),
        { name: 'log', type: 'console', with: { m: '{{ steps.b.output.label }}' } },
      ]);
      const readsOther = workflow('reads-other', [
        callStep('b', {}, undefined, 'b'),
        { name: 'log', type: 'console', with: { m: '{{ steps.b.output.other }}' } },
      ]);
      const analysis = analyzeWith([readsSeverity, readsLabel, readsOther], withoutSeverity);

      expect(upstreamOf(analysis, 'b')).toEqual(['reads-label:missingOutput:label']);
    });

    it('does not report a caller that keeps working without the output as failing', () => {
      const analysis = analyzeWith([readsSeverity, runs('above', 'b')], withoutSeverity);

      expect(dependentOf(analysis, 'b')?.status).toBe('breaking');
      expect(upstreamOf(analysis, 'b')).toEqual([]);
    });

    it('counts a workflow reached through two breaking callers once', () => {
      const failsToo = workflow('f2', [callStep('ctx', { inputs: { alert_id: 'a' } })]);
      const diamond = workflow('diamond', [
        callStep('one', {}, undefined, 'f'),
        callStep('two', {}, undefined, 'f2'),
      ]);
      const analysis = analyzeWith([failsOnNewInput, failsToo, diamond], withTenant);

      expect(upstreamOf(analysis, 'f')).toEqual(['diamond:fails']);
      expect(upstreamOf(analysis, 'f2')).toEqual(['diamond:fails']);
      expect(analysis.summary).toMatchObject({ breaking: 2, indirectBreaking: 1 });
    });

    it('leaves out callers that are turned off', () => {
      const offCaller = { ...failsOnNewInput, id: 'off', name: 'off', enabled: false };
      const offGrandparent = { ...runs('off-grandparent', 'f'), enabled: false };
      const analysis = analyzeWith([failsOnNewInput, offCaller, offGrandparent], withTenant);

      expect(statusById(analysis)).toMatchObject({ f: 'breaking', off: 'breaking' });
      expect(analysis.summary.breaking).toBe(1);
      expect(upstreamOf(analysis, 'f')).toEqual([]);
    });

    it('follows chains as deep as runs can nest, and no further', () => {
      const levels = Array.from({ length: MAX_INDIRECT_DEPTH }, (_, position) => position + 1);
      const chain = [
        failsOnNewInput,
        ...levels.map((level) => runs(`level-${level}`, level === 1 ? 'f' : `level-${level - 1}`)),
      ];
      const analysis = analyzeWith(chain, withTenant);

      // `f` itself is the first level, so the last caller in the chain is past the limit.
      expect(upstreamOf(analysis, 'f')).toEqual(
        levels.slice(0, MAX_INDIRECT_DEPTH - 1).map((level) => `level-${level}:fails`)
      );
    });
  });

  describe('validity', () => {
    it('breaks every caller when saving would store the workflow invalid', () => {
      const analysis = analyzeDependents({
        index,
        savedDefinition: makeChild(),
        draftDefinition: makeChild(),
        isDraftValid: false,
      });

      expect(analysis.contractChanges).toEqual([
        expect.objectContaining({ kind: 'invalid', severity: 'breaking' }),
      ]);
      expect(kinds(dependentOf(analysis, 'triage')?.issues)).toEqual(['childInvalid:breaking']);
      // The rows still describe the call with the last valid contract.
      expect(dependentOf(analysis, 'triage')?.callSites[0].inputs).toEqual([
        expect.objectContaining({ name: 'alert_id', status: 'ok' }),
      ]);
    });

    it('marks callers of a workflow already saved invalid as already broken', () => {
      const analysis = analyzeDependents({ index, savedDefinition: null, draftDefinition: null });

      expect(statusById(analysis).triage).toBe('alreadyBroken');
    });
  });
});

describe('analyzeCalledWorkflows', () => {
  const analyzeParent = (steps: unknown[], workflows: WorkflowLookupItem[] = [childItem]) =>
    analyzeCalledWorkflows({
      workflowId: 'parent',
      definition: { name: 'Parent', steps },
      workflows,
    });

  it('accepts a call that sends the required inputs and reads declared outputs', () => {
    const [called] = analyzeCalledWorkflows({
      workflowId: 'triage',
      definition: triage.definition,
      workflows: [childItem],
    });

    expect(called).toMatchObject({ workflowId: CHILD_ID, status: 'safe', issues: [] });
  });

  it('flags missing inputs and outputs the child does not return', () => {
    const [called] = analyzeParent([
      callStep('ctx', { inputs: {} }),
      { name: 'log', type: 'console', with: { message: '{{ steps.ctx.output.summary }}' } },
    ]);

    expect(called.status).toBe('breaking');
    expect(called.issues).toEqual([
      expect.objectContaining({ kind: 'missingRequiredInput', field: 'alert_id' }),
      expect.objectContaining({ kind: 'removedOutput', field: 'summary' }),
    ]);
  });

  it('flags children that are turned off, invalid, missing, or the workflow itself', () => {
    const called = analyzeParent(
      [
        callStep('ctx', { inputs: { alert_id: 'a' } }),
        callStep('bad', {}, undefined, 'invalid'),
        callStep('other', {}, undefined, 'missing'),
        callStep('again', {}, undefined, 'parent'),
      ],
      [
        { ...childItem, enabled: false },
        { id: 'invalid', name: 'invalid', enabled: false, definition: null },
      ]
    );

    expect(
      called.map(({ workflowId, issues }) => [workflowId, issues.map(({ kind }) => kind)])
    ).toEqual([
      [CHILD_ID, ['childDisabled']],
      ['invalid', ['childInvalid']],
      ['missing', ['childNotFound']],
      ['parent', ['selfCall']],
    ]);
  });

  it('flags a child that fails because a workflow it runs is broken', () => {
    const middle = workflow('middle', [callStep('ctx', { inputs: {} })]);
    const tolerant = workflow('tolerant', [
      { ...callStep('ctx', { inputs: {} }), 'on-failure': { continue: true } },
    ]);
    const called = analyzeParent(
      [
        callStep('m', {}, undefined, 'middle'),
        callStep('t', {}, undefined, 'tolerant'),
        callStep('bg', {}, 'workflow.executeAsync', 'middle'),
      ],
      [middle, tolerant, childItem]
    );

    expect(called.map(({ workflowId, issues }) => [workflowId, kinds(issues)])).toEqual([
      ['middle', ['childFails:breaking']],
      ['tolerant', []],
    ]);
    expect(called[0].issues[0]).toMatchObject({ stepName: 'm', from: 'ctx', to: 'Alert context' });
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

  it('ignores calls between workflows that are removed together', () => {
    const impact = analyzeRemovalImpact([CHILD_ID, 'triage'], [triage, nightly]);

    expect(impact.callers.map(({ id }) => id)).toEqual(['nightly']);
    expect(impact.indirect).toBe(0);
  });
});
