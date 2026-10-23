/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { parse } from 'yaml';
import {
  NIGHTSHIFT_MEMORY_SCHEDULED_JUDGES_WORKFLOW,
  NIGHTSHIFT_MEMORY_SCHEDULED_JUDGES_WORKFLOW_ID,
} from '.';
import { convertToWorkflowGraph } from '../../../../graph/build_execution_graph/build_execution_graph';
import type { WorkflowYaml } from '../../../../spec/schema';

const workflow = parse(NIGHTSHIFT_MEMORY_SCHEDULED_JUDGES_WORKFLOW.yaml) as {
  name: string;
  enabled: boolean;
  triggers: Array<{ type: string; with?: Record<string, unknown> }>;
  steps: Array<{ name: string; type?: string; timeout?: string; with?: Record<string, unknown> }>;
};

describe('nightshift memory scheduled judges workflow', () => {
  it('defines a scheduled + manual trigger workflow calling nightshift.memoryScheduledJudges', () => {
    expect(NIGHTSHIFT_MEMORY_SCHEDULED_JUDGES_WORKFLOW.id).toBe(
      NIGHTSHIFT_MEMORY_SCHEDULED_JUDGES_WORKFLOW_ID
    );
    expect(NIGHTSHIFT_MEMORY_SCHEDULED_JUDGES_WORKFLOW.version).toBe(1);
    expect(workflow.name).toBe('Nightshift Memory Scheduled Judges');
    expect(workflow.triggers).toEqual([
      expect.objectContaining({ type: 'scheduled', with: { every: '15m' } }),
      expect.objectContaining({ type: 'manual' }),
    ]);
    expect(workflow.steps).toEqual([
      expect.objectContaining({
        name: 'run_scheduled_judges',
        type: 'nightshift.memoryScheduledJudges',
        timeout: '180s',
      }),
    ]);
  });

  it('compiles cleanly into an execution graph', () => {
    const graph = convertToWorkflowGraph(
      parse(NIGHTSHIFT_MEMORY_SCHEDULED_JUDGES_WORKFLOW.yaml) as WorkflowYaml
    );
    const atomicSteps = graph
      .nodes()
      .map((id) => graph.node(id))
      .filter((node) => node?.type === 'atomic')
      .map((node) => (node as { stepId: string }).stepId);
    expect(atomicSteps).toEqual(['run_scheduled_judges']);
  });
});
