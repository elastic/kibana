/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { internalNamespaces } from '@kbn/agent-builder-common/base/namespaces';

export const WORKFLOW_YAML_ATTACHMENT_TYPE = 'workflow.yaml';
export const WORKFLOW_YAML_DIFF_ATTACHMENT_TYPE = 'workflow.yaml.diff';
export const WORKFLOW_YAML_CHANGED_EVENT = 'workflow:yaml_changed';

const workflowTool = <TName extends string>(
  toolName: TName
): `${typeof internalNamespaces.workflows}.${TName}` => {
  return `${internalNamespaces.workflows}.${toolName}`;
};

export const workflowTools = {
  insertStep: workflowTool('workflow_insert_step'),
  modifyStep: workflowTool('workflow_modify_step'),
  modifyStepProperty: workflowTool('workflow_modify_step_property'),
  modifyProperty: workflowTool('workflow_modify_property'),
  deleteStep: workflowTool('workflow_delete_step'),
  replaceYaml: workflowTool('workflow_replace_yaml'),
  getStepDefinitions: workflowTool('get_step_definitions'),
  getTriggerDefinitions: workflowTool('get_trigger_definitions'),
  validateWorkflow: workflowTool('validate_workflow'),
  listWorkflows: workflowTool('list_workflows'),
  getWorkflow: workflowTool('get_workflow'),
  getExamples: workflowTool('get_examples'),
  getConnectors: workflowTool('get_connectors'),
} as const;
