/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export const WORKFLOW_YAML_CHANGED_EVENT = 'workflow:yaml_changed';

/**
 * The following constants are kept here to avoid a circular plugin dependency.
 * The canonical definitions live in @kbn/agent-builder-workflows-plugin/common,
 * but that plugin depends on workflowsManagement, so workflows_management cannot
 * import from it.
 */
export const WORKFLOW_YAML_ATTACHMENT_TYPE = 'workflow.yaml';
export const WORKFLOW_SML_TYPE = 'workflow';
