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
  getNightshiftBoundHookWorkflowId,
  NIGHTSHIFT_BOUND_AGENT_OPTIMIZE_WORKFLOW,
  NIGHTSHIFT_BOUND_AGENT_OPTIMIZE_WORKFLOW_ID,
  NIGHTSHIFT_BOUND_DECISION_TREE_HYDRATE_WORKFLOW,
  NIGHTSHIFT_BOUND_HOOK_TARGETS,
  NIGHTSHIFT_BOUND_SANDBOX_MATERIALIZE_WORKSPACE_WORKFLOW,
} from '.';
import { AGENT_BUILDER_HOOK_TRIGGER_SOURCE } from '../../../../common/well_known_trigger_sources';
import { WorkflowSchema } from '../../../../spec/schema';
import { NIGHTSHIFT_AGENT_OPTIMIZE_WORKFLOW } from '../agent_optimize';
import { NIGHTSHIFT_DECISION_TREE_HYDRATE_WORKFLOW } from '../decision_tree_hydrate';
import { NIGHTSHIFT_SANDBOX_MATERIALIZE_WORKSPACE_WORKFLOW } from '../sandbox_materialize_workspace';

const ACCOUNT = 'kibana/nightshift_agent';

const cases = [
  [
    NIGHTSHIFT_BOUND_SANDBOX_MATERIALIZE_WORKSPACE_WORKFLOW,
    NIGHTSHIFT_SANDBOX_MATERIALIZE_WORKSPACE_WORKFLOW,
  ],
  [NIGHTSHIFT_BOUND_AGENT_OPTIMIZE_WORKFLOW, NIGHTSHIFT_AGENT_OPTIMIZE_WORKFLOW],
  [NIGHTSHIFT_BOUND_DECISION_TREE_HYDRATE_WORKFLOW, NIGHTSHIFT_DECISION_TREE_HYDRATE_WORKFLOW],
] as const;

describe.each(cases)('Nightshift bound hook %#', (bound, hook) => {
  const rendered = parse(bound.yamlTemplate({ serviceAccountId: ACCOUNT }));

  it('is a dynamic, per-space definition pointing at its global hook', () => {
    expect(bound.pluginId).toBe('nightshiftInvestigations');
    expect(bound.management.lifecycle).toBe('dynamic');
    expect(NIGHTSHIFT_BOUND_HOOK_TARGETS[bound.id]).toBe(hook.id);
    expect(WorkflowSchema.safeParse(rendered).success).toBe(true);
  });

  it('runs as the service account and calls the hook with its identity', () => {
    expect(rendered.settings.run_as).toBe(ACCOUNT);
    expect(rendered.steps).toEqual([
      expect.objectContaining({ name: 'refuse_direct_runs' }),
      {
        name: 'run_hook',
        type: 'workflow.execute',
        with: { 'workflow-id': hook.id, 'run-as-mode': 'inherit', inputs: '${{ inputs }}' },
      },
    ]);
  });

  // Its inputs are the round's content, which the hook learns from as the account.
  it('fails every run Agent Builder did not start as a hook', () => {
    const [guard] = rendered.steps;
    expect(guard).toEqual({
      name: 'refuse_direct_runs',
      type: 'if',
      condition: `not execution.triggeredBy : "${AGENT_BUILDER_HOOK_TRIGGER_SOURCE}"`,
      steps: [expect.objectContaining({ name: 'refuse', type: 'workflow.fail' })],
    });
  });

  it("declares exactly the hook's inputs, so Agent Builder passes it the same ones", () => {
    expect(rendered.triggers).toEqual(parse(hook.yaml).triggers);
  });

  // The definition hash of a template does not cover the hook's triggers, so a change to them
  // only reaches installed copies through a version bump. Update both together.
  it('pins its version to the hook triggers', () => {
    expect({ version: bound.version, triggers: parse(hook.yaml).triggers }).toMatchSnapshot();
  });
});

describe('getNightshiftBoundHookWorkflowId', () => {
  it('suffixes the space', () => {
    expect(
      getNightshiftBoundHookWorkflowId(NIGHTSHIFT_BOUND_AGENT_OPTIMIZE_WORKFLOW_ID, 'sa-a')
    ).toBe('system-nightshift-agent-optimize-bound-sa-a');
  });
});
