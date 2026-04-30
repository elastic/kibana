/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { AgentContextLayerPluginSetup } from '@kbn/agent-context-layer-plugin/server';
import { createWorkflowYamlAttachmentType } from './workflow_yaml_attachment';
import { workflowYamlDiffAttachmentType } from './workflow_yaml_diff_attachment';
import type { WorkflowsManagementApi } from '../../api/workflows_management_api';

export function registerWorkflowResolverAttachmentTypes(
  agentContextLayer: AgentContextLayerPluginSetup,
  api: WorkflowsManagementApi
): void {
  agentContextLayer.registerResolverType(createWorkflowYamlAttachmentType(api));
  agentContextLayer.registerResolverType(workflowYamlDiffAttachmentType);
}
