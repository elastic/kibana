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
import { renderRunAs } from '../render_bound_yaml';

export const NIGHTSHIFT_BOUND_SLACK_THREAD_WORKFLOW_ID = 'system-nightshift-slack-thread-bound';

export interface NightshiftBoundSlackThreadTemplateValues extends ManagedWorkflowTemplateValues {
  serviceAccountId: string;
}

/**
 * Renders the Slack thread YAML with `settings.run_as`. Nothing installs it yet: the switch to
 * service accounts also makes its call to the global investigation inherit this binding, and stops
 * installing the unbound global copy.
 */
export const renderBoundSlackThreadYaml = ({
  serviceAccountId,
}: NightshiftBoundSlackThreadTemplateValues): string =>
  renderRunAs(SLACK_THREAD_WORKFLOW_YAML, serviceAccountId);

/** The Slack thread workflow, installed per space next to the bound investigation entry point. */
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
