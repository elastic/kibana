/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { WorkflowDependentsLookup } from './workflow_dependents_impact';
import { analyzeWorkflowRemovalImpact, collectCallers } from './workflow_dependents_impact';
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

/** Fakes the ES lookups over an in-memory list; `unindexed` documents have no indexed callees. */
const createLookup = (
  indexed: WorkflowLookupItem[],
  unindexed: WorkflowLookupItem[] = []
): WorkflowDependentsLookup & { findIndexedCallers: jest.Mock } => ({
  findIndexedCallers: jest.fn(async (ids: string[]) =>
    indexed.filter(({ definition }) =>
      getCalledWorkflowIds(definition).some((id) => ids.includes(id))
    )
  ),
  findUnindexedWorkflows: jest.fn(async () => unindexed),
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

describe('analyzeWorkflowRemovalImpact', () => {
  it('lists the callers that fail when the workflows stop running', async () => {
    const impact = await analyzeWorkflowRemovalImpact(
      ['child'],
      createLookup([workflow('direct', [runs('child')]), workflow('top', [runs('direct', {})])])
    );

    expect(impact).toEqual({ callers: [{ id: 'direct', name: 'direct' }], indirect: 1 });
  });
});
