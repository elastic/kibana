/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { WorkflowDependentsLookup } from './workflow_dependents_impact';
import {
  analyzeWorkflowDependentsImpact,
  analyzeWorkflowRemovalImpact,
  collectCalledWorkflows,
  collectCallers,
  parseDraftDefinition,
} from './workflow_dependents_impact';
import { getCalledWorkflowIds } from '../../../common/lib/workflow_dependents/find_call_sites';
import type { WorkflowLookupItem } from '../../../common/lib/workflow_dependents/types';

const runs = (workflowId: string, inputs: Record<string, unknown> = { alert_id: 'a' }) => ({
  name: `run-${workflowId}`,
  type: 'workflow.execute',
  with: { 'workflow-id': workflowId, inputs },
});

const workflow = (id: string, steps: unknown[]): WorkflowLookupItem => ({
  id,
  name: id,
  enabled: true,
  definition: { name: id, triggers: [{ type: 'manual' }], steps },
});

const child = (inputs: Array<Record<string, unknown>>) => ({
  name: 'child',
  enabled: true,
  triggers: [{ type: 'manual', inputs }],
  steps: [{ name: 'log', type: 'console', with: { message: 'hi' } }],
});

const savedChild = child([{ name: 'alert_id', type: 'string', required: true }]);
const draftChild = child([
  { name: 'alert_id', type: 'string', required: true },
  { name: 'tenant', type: 'string', required: true },
]);

/** Fakes the ES lookups over an in-memory list; `unindexed` documents have no indexed callees. */
const createLookup = (
  indexed: WorkflowLookupItem[],
  unindexed: WorkflowLookupItem[] = [],
  called: WorkflowLookupItem[] = []
): WorkflowDependentsLookup & { findIndexedCallers: jest.Mock; getWorkflowsByIds: jest.Mock } => ({
  findIndexedCallers: jest.fn(async (ids: string[]) =>
    indexed.filter(({ definition }) =>
      getCalledWorkflowIds(definition).some((id) => ids.includes(id))
    )
  ),
  findUnindexedWorkflows: jest.fn(async () => unindexed),
  getWorkflowsByIds: jest.fn(async (ids: string[]) => called.filter(({ id }) => ids.includes(id))),
});

describe('collectCallers', () => {
  it('walks callers of callers through indexed and unindexed workflows', async () => {
    const direct = workflow('direct', [runs('child')]);
    const legacyIndirect = workflow('legacy-indirect', [runs('direct', {})]);
    const topLevel = workflow('top-level', [runs('legacy-indirect', {})]);
    const unrelated = workflow('unrelated-legacy', [runs('someone-else', {})]);
    const lookup = createLookup([direct, topLevel], [legacyIndirect, unrelated]);

    const callers = await collectCallers(['child'], lookup);

    expect(callers.map(({ id }) => id).sort()).toEqual(['direct', 'legacy-indirect', 'top-level']);
    expect(lookup.findIndexedCallers.mock.calls).toEqual([
      [['child']],
      [['direct']],
      [['legacy-indirect']],
      [['top-level']],
    ]);
  });

  it('stops on call cycles', async () => {
    const lookup = createLookup([
      workflow('a', [runs('child'), runs('b', {})]),
      workflow('b', [runs('a', {})]),
    ]);

    const callers = await collectCallers(['child'], lookup);

    expect(callers.map(({ id }) => id).sort()).toEqual(['a', 'b']);
  });

  it('follows chains as deep as runs can nest', async () => {
    const chain = Array.from({ length: 10 }, (_, level) =>
      workflow(`level-${level + 1}`, [runs(level === 0 ? 'child' : `level-${level}`, {})])
    );

    const callers = await collectCallers(['child'], createLookup(chain));

    expect(callers).toHaveLength(10);
  });
});

describe('collectCalledWorkflows', () => {
  it('fetches the workflows the definition runs and the ones those run, once each', async () => {
    const middle = workflow('middle', [runs('leaf'), runs('parent', {})]);
    const leaf = workflow('leaf', [runs('middle', {})]);
    const lookup = createLookup([], [], [middle, leaf]);

    const called = await collectCalledWorkflows(
      'parent',
      { steps: [runs('middle', {}), runs('parent', {})] },
      lookup
    );

    expect(called.map(({ id }) => id)).toEqual(['middle', 'leaf']);
    expect(lookup.getWorkflowsByIds.mock.calls).toEqual([[['middle']], [['leaf']]]);
  });
});

describe('analyzeWorkflowDependentsImpact reads', () => {
  it('reads the workflows the draft and the saved version both run once', async () => {
    const leaf = workflow('leaf', []);
    const lookup = createLookup([], [], [leaf]);
    const definition = { steps: [runs('leaf', {})] };

    await analyzeWorkflowDependentsImpact({
      workflowId: 'parent',
      savedDefinition: definition,
      draftDefinition: { ...definition, description: 'edited' },
      lookup,
    });

    expect(lookup.getWorkflowsByIds.mock.calls).toEqual([[['leaf']]]);
  });
});

describe('analyzeWorkflowDependentsImpact', () => {
  it('grades callers against the draft and counts what a save breaks', async () => {
    const direct = workflow('direct', [runs('child')]);
    const indirect = workflow('indirect', [runs('direct', {})]);

    const { analysis, calledWorkflows } = await analyzeWorkflowDependentsImpact({
      workflowId: 'child',
      savedDefinition: savedChild,
      draftDefinition: draftChild,
      lookup: createLookup([direct, indirect]),
    });

    expect(analysis.dependents).toEqual([
      expect.objectContaining({ workflowId: 'direct', status: 'breaking' }),
    ]);
    expect(calledWorkflows).toEqual([]);
    expect(analysis.summary).toMatchObject({ breaking: 1, indirectBreaking: 1 });
  });

  it('breaks every caller when the draft would be saved invalid', async () => {
    const { analysis } = await analyzeWorkflowDependentsImpact({
      workflowId: 'child',
      savedDefinition: savedChild,
      draftDefinition: savedChild,
      isDraftValid: false,
      lookup: createLookup([workflow('direct', [runs('child')])]),
    });

    expect(analysis.dependents).toEqual([
      expect.objectContaining({
        status: 'breaking',
        issues: [expect.objectContaining({ kind: 'childInvalid' })],
      }),
    ]);
  });

  it('grades a half-written draft whose inputs declare a property as null', async () => {
    const draft = {
      name: 'child',
      triggers: [{ type: 'manual', inputs: { properties: { bad: null } } }],
      steps: [runs('leaf', {})],
    };

    const { analysis, calledWorkflows } = await analyzeWorkflowDependentsImpact({
      workflowId: 'child',
      savedDefinition: savedChild,
      draftDefinition: draft,
      isDraftValid: false,
      lookup: createLookup([workflow('direct', [runs('child')])], [], [workflow('leaf', [])]),
    });

    expect(analysis.dependents).toEqual([
      expect.objectContaining({
        status: 'breaking',
        issues: [expect.objectContaining({ kind: 'childInvalid' })],
      }),
    ]);
    expect(calledWorkflows).toEqual([expect.objectContaining({ workflowId: 'leaf' })]);
  });

  describe('grades drafts being typed without throwing', () => {
    const call = runs('leaf', { a: 1 });
    const withInputs = (inputs: unknown) => ({
      triggers: [{ type: 'manual', inputs }],
      steps: [call],
    });
    const output = (extra: Record<string, unknown>) => ({
      name: 'o',
      type: 'workflow.output',
      ...extra,
    });
    const drafts: Record<string, unknown> = {
      'required that is not a list': withInputs({ properties: { a: {} }, required: 5 }),
      'properties that are not a map': withInputs({ properties: 5 }),
      'a list of properties': withInputs({ properties: [1, null] }),
      'additionalProperties that is not a schema': withInputs({ additionalProperties: 5 }),
      'nested properties and required that are malformed': withInputs({
        properties: { o: { type: 'object', properties: { x: null }, required: 5 } },
        required: ['o'],
      }),
      'type, enum and default of the wrong kind': withInputs({
        properties: { a: { type: 5, enum: 5, default: null } },
      }),
      'a $ref that is not a string': withInputs({ properties: { a: { $ref: 5 } }, $defs: null }),
      'inputs that are not a list or schema': withInputs(5),
      'a list of malformed inputs': withInputs([null, 5, { name: 5 }]),
      'triggers that are not a list': { triggers: 5, steps: [call] },
      'steps that are not a list': { steps: 5 },
      'malformed steps': { steps: [null, 5, { type: 5 }, call] },
      'malformed outputs': {
        outputs: [null, { name: 5 }, { name: 'x', type: 5 }],
        steps: [call, output({ with: 5 })],
      },
      'outputs as a malformed schema': {
        outputs: { properties: { x: null }, required: 5 },
        steps: [call, output({ with: { x: 1 } })],
      },
      'a malformed workflow-level on-failure': {
        settings: { 'on-failure': { fallback: [null, output({ with: 5 })], continue: 5 } },
        steps: [call],
      },
      'a malformed step-level fallback': {
        steps: [{ ...call, 'on-failure': { fallback: [null, 5, output({})] } }],
      },
      'malformed containers': {
        steps: [
          { name: 'l', type: 'while', steps: 5 },
          { name: 'f', type: 'foreach', foreach: 5, steps: [null, call] },
          { name: 'p', type: 'parallel', branches: 5 },
          { name: 'i', type: 'if', condition: 5, steps: [call], else: 5 },
        ],
      },
      'a draft that is not an object': [1, 2],
    };

    it.each(Object.entries(drafts))('with %s', async (_, draft) => {
      for (const isDraftValid of [true, false]) {
        await expect(
          analyzeWorkflowDependentsImpact({
            workflowId: 'child',
            savedDefinition: savedChild,
            draftDefinition: draft,
            isDraftValid,
            lookup: createLookup([workflow('direct', [runs('child')])], [], [workflow('leaf', [])]),
          })
        ).resolves.toBeDefined();
      }
    });
  });

  it('leaves callers that are turned off out of the breaking count', async () => {
    const { analysis } = await analyzeWorkflowDependentsImpact({
      workflowId: 'child',
      savedDefinition: savedChild,
      draftDefinition: draftChild,
      lookup: createLookup([{ ...workflow('off', [runs('child')]), enabled: false }]),
    });

    expect(analysis.dependents).toEqual([expect.objectContaining({ status: 'breaking' })]);
    expect(analysis.summary).toMatchObject({ breaking: 0, indirectBreaking: 0 });
  });

  it('grades the workflows the draft runs', async () => {
    const parentDraft = { name: 'parent', steps: [runs('child', {}), runs('middle', {})] };
    const middle = workflow('middle', [runs('child', {})]);

    const { calledWorkflows } = await analyzeWorkflowDependentsImpact({
      workflowId: 'parent',
      savedDefinition: parentDraft,
      draftDefinition: parentDraft,
      lookup: createLookup([], [], [{ ...workflow('child', []), definition: savedChild }, middle]),
    });

    expect(calledWorkflows).toEqual([
      expect.objectContaining({
        workflowId: 'child',
        status: 'breaking',
        issues: [expect.objectContaining({ kind: 'missingRequiredInput', field: 'alert_id' })],
      }),
      expect.objectContaining({ workflowId: 'middle', status: 'safe', issues: [] }),
    ]);
  });

  it('describes a draft that doesn’t parse as one saved invalid, which runs nothing', async () => {
    const { analysis, calledWorkflows } = await analyzeWorkflowDependentsImpact({
      workflowId: 'child',
      savedDefinition: savedChild,
      draftDefinition: parseDraftDefinition('steps: ['),
      isDraftValid: false,
      lookup: createLookup([workflow('direct', [runs('child')])], [], [workflow('leaf', [])]),
    });

    expect(analysis.dependents).toEqual([
      expect.objectContaining({
        status: 'breaking',
        issues: [expect.objectContaining({ kind: 'childInvalid' })],
      }),
    ]);
    expect(calledWorkflows).toEqual([]);
  });
});

describe('analyzeWorkflowRemovalImpact', () => {
  it('lists the callers that fail when the workflows stop running', async () => {
    const impact = await analyzeWorkflowRemovalImpact(
      ['child'],
      createLookup([workflow('direct', [runs('child')]), workflow('top', [runs('direct', {})])])
    );

    expect(impact).toEqual({ callers: [{ id: 'direct', name: 'direct' }], indirect: 1 });
  });
});

describe('parseDraftDefinition', () => {
  it('has no definition for YAML with syntax errors', () => {
    expect(parseDraftDefinition('name: [unclosed')).toBeNull();
    expect(parseDraftDefinition('name: ok')).toEqual({ name: 'ok' });
  });

  it('has no definition for YAML with an unresolved alias', () => {
    expect(parseDraftDefinition('name: ok\nconsts:\n  message: *not_defined_yet')).toBeNull();
  });
});
