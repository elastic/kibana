/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { RuleRunContribution } from '@kbn/alerting-plugin/server/task_types/rule_run_contribution';
import { taskType } from '@kbn/workflows-execution-engine/server/task_types/workflow_run.task';
import type { WorkflowsExtensionsServerPluginStart } from '@kbn/workflows-extensions/server';
import { getConnectorType, getWorkflowsConnectorAdapter } from '../connectors/workflows';
import type { WorkflowConnectorManagement } from '../connectors/workflows';

/** Registers the system connector with the management API of the executing workflow. */
export const contribution: RuleRunContribution = {
  declares: { featureFlags: taskType.featureFlags, registersConnectorTypes: true },
  executionServices: {
    ids: ['workflows.management', 'workflows.extensions'],
    requirements: taskType,
    isEnabled: (settings) => settings.workflowsManagementRuntime !== undefined,
    create: async ({ host }) => {
      const { createWorkflowRuntimeFromHost } = await import(
        '@kbn/workflows-execution-engine/server/task_types/process_runtime'
      );
      return createWorkflowRuntimeFromHost(host);
    },
  },
  getWorkflowsClient: (request, context) => {
    if (!context.getService) throw new Error('Native workflow services are required');
    return context
      .getService<WorkflowsExtensionsServerPluginStart>('workflows.extensions')
      .getClient(request);
  },
  register: ({ actions, alerting }, context) => {
    actions.registerType(
      getConnectorType(() => {
        if (!context.getService) {
          throw new Error(
            'Workflow execution services are required to execute the workflows connector'
          );
        }
        return context.getService<WorkflowConnectorManagement>('workflows.management');
      })
    );
    alerting.registerConnectorAdapter(getWorkflowsConnectorAdapter());
  },
};
