/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import SLACK_THREAD_WORKFLOW_YAML from './slack_thread_workflow.yaml';
import type { ManagedWorkflowDefinition, ManagedWorkflowTemplateValues } from '../../../types';
import { NIGHTSHIFT_INVESTIGATION_WORKFLOW_ID } from '../investigation';
import { getNightshiftBoundInvestigationWorkflowId } from '../investigation/bound_investigation';
import { assertSpaceId, renderRunAs } from '../render_bound_yaml';

export const NIGHTSHIFT_BOUND_SLACK_THREAD_WORKFLOW_ID = 'system-nightshift-slack-thread-bound';

export interface NightshiftBoundSlackThreadTemplateValues extends ManagedWorkflowTemplateValues {
  serviceAccountId: string;
  /** The space this copy is installed in; its investigation call targets that space's copy. */
  spaceId: string;
}

const INVESTIGATION_CALL = `workflow-id: ${NIGHTSHIFT_INVESTIGATION_WORKFLOW_ID}\n`;

/**
 * Renders the Slack thread YAML with `settings.run_as`, calling the space's bound investigation.
 * The call keeps the default `run-as-mode`: the bound investigation runs with its own binding.
 */
export const renderBoundSlackThreadYaml = ({
  serviceAccountId,
  spaceId,
}: NightshiftBoundSlackThreadTemplateValues): string => {
  if (!SLACK_THREAD_WORKFLOW_YAML.includes(INVESTIGATION_CALL)) {
    throw new Error('The Slack thread workflow no longer calls the investigation workflow');
  }
  return renderRunAs(SLACK_THREAD_WORKFLOW_YAML, serviceAccountId).replace(
    INVESTIGATION_CALL,
    `workflow-id: ${getNightshiftBoundInvestigationWorkflowId(assertSpaceId(spaceId))}\n`
  );
};

/** The Slack thread workflow, installed per space next to the bound investigation. */
export const NIGHTSHIFT_BOUND_SLACK_THREAD_WORKFLOW = {
  id: NIGHTSHIFT_BOUND_SLACK_THREAD_WORKFLOW_ID,
  pluginId: 'nightshiftInvestigations',
  version: 1,
  billable: false,
  yamlTemplate: renderBoundSlackThreadYaml,
  management: {
    lifecycle: 'dynamic',
    versionStrategy: 'auto',
    enablement: 'restorable',
  },
} as const satisfies ManagedWorkflowDefinition<NightshiftBoundSlackThreadTemplateValues>;
