/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { AGENT_BUILDER_HOOK_TRIGGER_SOURCE } from '../../../../common/well_known_trigger_sources';
import type { ManagedWorkflowDefinition, ManagedWorkflowTemplateValues } from '../../../types';
import { NIGHTSHIFT_AGENT_OPTIMIZE_WORKFLOW_ID } from '../agent_optimize';
import AGENT_OPTIMIZE_WORKFLOW_YAML from '../agent_optimize/agent_optimize_workflow.yaml';
import { NIGHTSHIFT_DECISION_TREE_HYDRATE_WORKFLOW_ID } from '../decision_tree_hydrate';
import DECISION_TREE_HYDRATE_WORKFLOW_YAML from '../decision_tree_hydrate/decision_tree_hydrate_workflow.yaml';
import { renderRunAs, SERVICE_ACCOUNT_ID_TOKEN } from '../render_bound_yaml';
import { NIGHTSHIFT_SANDBOX_MATERIALIZE_WORKSPACE_WORKFLOW_ID } from '../sandbox_materialize_workspace';
import SANDBOX_MATERIALIZE_WORKSPACE_WORKFLOW_YAML from '../sandbox_materialize_workspace/sandbox_materialize_workspace_workflow.yaml';

export interface NightshiftBoundHookTemplateValues extends ManagedWorkflowTemplateValues {
  /** The service account the hook runs as, e.g. `kibana/nightshift_agent`. */
  serviceAccountId: string;
}

/** The trigger block (with its declared inputs) of a hook workflow, verbatim. */
const getTriggersBlock = (yaml: string): string => {
  const match = /^triggers:\n[\s\S]*?(?=^steps:\n)/m.exec(yaml);
  if (!match) {
    throw new Error('The hook workflow YAML has no top-level triggers block before its steps');
  }
  return match[0].trimEnd();
};

/**
 * A space's entry point to a global Agent Builder hook workflow. Agent Builder starts hooks with
 * the request of the agent run, and the workflows engine runs a workflow started that way as the
 * original caller, so a hook of an investigation running as the service account would run as the
 * user who started it. This entry point is bound to the service account instead and calls the
 * hook with `run-as-mode: inherit`, so the hook runs as the account. It declares the hook's own
 * inputs, because Agent Builder passes optional hook inputs only to workflows that declare them,
 * and its last step's output is the hook's output, which Agent Builder reads.
 *
 * It refuses every run Agent Builder did not start as a hook. The hook inputs carry the round's
 * content (prompt, response, tool calls and results), and the hook writes what it learns from
 * them to Nightshift's knowledge as the account. Anyone allowed to run workflows could otherwise
 * start it directly with made-up content. Only server code sets `triggeredBy`.
 */
const renderBoundHookYaml = ({
  hookWorkflowId,
  hookYaml,
  name,
  serviceAccountId,
}: {
  hookWorkflowId: string;
  hookYaml: string;
  name: string;
  serviceAccountId: string;
}): string =>
  renderRunAs(
    `version: '1'
name: ${JSON.stringify(`${name} (space entry point)`)}
description: >
  Runs ${hookWorkflowId} in this space as the Nightshift service account. It only hands its
  inputs to the shared hook workflow, which runs with this workflow's identity.
enabled: true
settings:
  run_as: ${SERVICE_ACCOUNT_ID_TOKEN}
  # Longer than any hook runs, since this run waits for it.
  timeout: '30m'
tags:
  - observability
  - nightshift
  - investigation

${getTriggersBlock(hookYaml)}

steps:
  - name: refuse_direct_runs
    type: if
    condition: 'not execution.triggeredBy : "${AGENT_BUILDER_HOOK_TRIGGER_SOURCE}"'
    steps:
      - name: refuse
        type: workflow.fail
        with:
          message: >-
            ${hookWorkflowId} runs as the Nightshift service account and only Agent Builder may
            start it, as an agent hook. This run was started by {{ execution.triggeredBy }}.

  - name: run_hook
    type: workflow.execute
    with:
      workflow-id: ${hookWorkflowId}
      run-as-mode: inherit
      inputs: \${{ inputs }}
`,
    serviceAccountId
  );

export const NIGHTSHIFT_BOUND_SANDBOX_MATERIALIZE_WORKSPACE_WORKFLOW_ID = `${NIGHTSHIFT_SANDBOX_MATERIALIZE_WORKSPACE_WORKFLOW_ID}-bound`;
export const NIGHTSHIFT_BOUND_AGENT_OPTIMIZE_WORKFLOW_ID = `${NIGHTSHIFT_AGENT_OPTIMIZE_WORKFLOW_ID}-bound`;
export const NIGHTSHIFT_BOUND_DECISION_TREE_HYDRATE_WORKFLOW_ID = `${NIGHTSHIFT_DECISION_TREE_HYDRATE_WORKFLOW_ID}-bound`;

/** The global hook workflow each bound hook entry point calls. */
export const NIGHTSHIFT_BOUND_HOOK_TARGETS = {
  [NIGHTSHIFT_BOUND_SANDBOX_MATERIALIZE_WORKSPACE_WORKFLOW_ID]:
    NIGHTSHIFT_SANDBOX_MATERIALIZE_WORKSPACE_WORKFLOW_ID,
  [NIGHTSHIFT_BOUND_AGENT_OPTIMIZE_WORKFLOW_ID]: NIGHTSHIFT_AGENT_OPTIMIZE_WORKFLOW_ID,
  [NIGHTSHIFT_BOUND_DECISION_TREE_HYDRATE_WORKFLOW_ID]:
    NIGHTSHIFT_DECISION_TREE_HYDRATE_WORKFLOW_ID,
} as const;

/** Document id of a bound hook entry point installed in a space (with `workflowIdSuffix`). */
export const getNightshiftBoundHookWorkflowId = (
  boundHookId: keyof typeof NIGHTSHIFT_BOUND_HOOK_TARGETS,
  spaceId: string
): string => `${boundHookId}-${spaceId}`;

const management = {
  lifecycle: 'dynamic',
  versionStrategy: 'auto',
  enablement: 'restorable',
} as const;

// The definition hash of a template is the hash of its function source, which does not change
// when the hook's inputs do. Bump `version` whenever a hook's trigger block changes; the
// `bound_hooks` test pins each version to the hook's triggers to catch that.
export const NIGHTSHIFT_BOUND_SANDBOX_MATERIALIZE_WORKSPACE_WORKFLOW = {
  id: NIGHTSHIFT_BOUND_SANDBOX_MATERIALIZE_WORKSPACE_WORKFLOW_ID,
  pluginId: 'nightshiftInvestigations',
  version: 1,
  billable: false,
  yamlTemplate: ({ serviceAccountId }: NightshiftBoundHookTemplateValues) =>
    renderBoundHookYaml({
      hookWorkflowId: NIGHTSHIFT_SANDBOX_MATERIALIZE_WORKSPACE_WORKFLOW_ID,
      hookYaml: SANDBOX_MATERIALIZE_WORKSPACE_WORKFLOW_YAML,
      name: 'Nightshift Sandbox Materialize Workspace',
      serviceAccountId,
    }),
  management,
} as const satisfies ManagedWorkflowDefinition<NightshiftBoundHookTemplateValues>;

export const NIGHTSHIFT_BOUND_AGENT_OPTIMIZE_WORKFLOW = {
  id: NIGHTSHIFT_BOUND_AGENT_OPTIMIZE_WORKFLOW_ID,
  pluginId: 'nightshiftInvestigations',
  version: 1,
  billable: false,
  yamlTemplate: ({ serviceAccountId }: NightshiftBoundHookTemplateValues) =>
    renderBoundHookYaml({
      hookWorkflowId: NIGHTSHIFT_AGENT_OPTIMIZE_WORKFLOW_ID,
      hookYaml: AGENT_OPTIMIZE_WORKFLOW_YAML,
      name: 'Nightshift Agent Optimize',
      serviceAccountId,
    }),
  management,
} as const satisfies ManagedWorkflowDefinition<NightshiftBoundHookTemplateValues>;

export const NIGHTSHIFT_BOUND_DECISION_TREE_HYDRATE_WORKFLOW = {
  id: NIGHTSHIFT_BOUND_DECISION_TREE_HYDRATE_WORKFLOW_ID,
  pluginId: 'nightshiftInvestigations',
  version: 1,
  billable: false,
  yamlTemplate: ({ serviceAccountId }: NightshiftBoundHookTemplateValues) =>
    renderBoundHookYaml({
      hookWorkflowId: NIGHTSHIFT_DECISION_TREE_HYDRATE_WORKFLOW_ID,
      hookYaml: DECISION_TREE_HYDRATE_WORKFLOW_YAML,
      name: 'Decision Tree Hydrate',
      serviceAccountId,
    }),
  management,
} as const satisfies ManagedWorkflowDefinition<NightshiftBoundHookTemplateValues>;
