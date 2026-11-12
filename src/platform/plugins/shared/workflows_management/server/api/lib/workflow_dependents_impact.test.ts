/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { InvalidYamlSyntaxError } from '@kbn/workflows-yaml';
import type { WorkflowDependentsLookup } from './workflow_dependents_impact';
import {
  analyzeWorkflowDependentsImpact,
  analyzeWorkflowRemovalImpact,
  collectCalledWorkflows,
  collectCallers,
  hasCallerFacingChanges,
  parseDraftDefinition,
  summarizeSaveImpact,
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

describe('analyzeWorkflowDependentsImpact', () => {
  it('grades callers against the draft and summarizes what a save breaks', async () => {
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
    expect(summarizeSaveImpact(analysis)).toEqual({
      breaking: [{ id: 'direct', name: 'direct' }],
      indirectBreaking: 1,
    });
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

  it('leaves callers that are turned off out of the save summary', async () => {
    const { analysis } = await analyzeWorkflowDependentsImpact({
      workflowId: 'child',
      savedDefinition: savedChild,
      draftDefinition: draftChild,
      lookup: createLookup([{ ...workflow('off', [runs('child')]), enabled: false }]),
    });

    expect(analysis.dependents).toEqual([expect.objectContaining({ status: 'breaking' })]);
    expect(summarizeSaveImpact(analysis)).toEqual({ breaking: [], indirectBreaking: 0 });
  });

  it('grades the workflows the draft runs, including failures further down', async () => {
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
      expect.objectContaining({
        workflowId: 'middle',
        status: 'breaking',
        issues: [expect.objectContaining({ kind: 'childFails', to: 'child' })],
      }),
    ]);
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

describe('hasCallerFacingChanges', () => {
  it('ignores edits that callers cannot see', () => {
    const renamedStep = {
      ...savedChild,
      steps: [{ name: 'log2', type: 'console', with: { message: 'bye' } }],
    };

    expect(hasCallerFacingChanges(savedChild, renamedStep)).toBe(false);
    expect(hasCallerFacingChanges(savedChild, draftChild)).toBe(true);
    expect(hasCallerFacingChanges(savedChild, { ...savedChild, enabled: false })).toBe(true);
    // Saving invalid YAML stores the workflow without a definition.
    expect(hasCallerFacingChanges(savedChild, null)).toBe(true);
  });
});

describe('parseDraftDefinition', () => {
  it('rejects YAML with syntax errors', () => {
    expect(() => parseDraftDefinition('name: [unclosed')).toThrow(InvalidYamlSyntaxError);
    expect(parseDraftDefinition('name: ok')).toEqual({ name: 'ok' });
  });
});
