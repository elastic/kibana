/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';

export const NO_CONFIGURATION_REQUIRED = i18n.translate(
  'xpack.stackConnectors.components.workflows.noConfigurationRequired',
  {
    defaultMessage:
      'No configuration required. This connector uses the internal Kibana workflows API.',
  }
);

export const WORKFLOW_ID_LABEL = i18n.translate(
  'xpack.stackConnectors.components.workflows.workflowIdTextFieldLabel',
  {
    defaultMessage: 'Workflow ID',
  }
);

export const WORKFLOW_ID_REQUIRED = i18n.translate(
  'xpack.stackConnectors.components.workflows.error.requiredWorkflowIdText',
  {
    defaultMessage: 'Workflow ID is required.',
  }
);

export const SELECT_WORKFLOW_PLACEHOLDER = i18n.translate(
  'xpack.stackConnectors.components.workflows.selectWorkflowPlaceholder',
  {
    defaultMessage: 'Select a workflow',
  }
);

export const LOADING_WORKFLOWS = i18n.translate(
  'xpack.stackConnectors.components.workflows.loadingWorkflows',
  {
    defaultMessage: 'Loading workflows...',
  }
);

export const NO_WORKFLOWS_AVAILABLE = i18n.translate(
  'xpack.stackConnectors.components.workflows.noWorkflowsAvailable',
  {
    defaultMessage: 'No workflows available',
  }
);

export const FAILED_TO_LOAD_WORKFLOWS = i18n.translate(
  'xpack.stackConnectors.components.workflows.failedToLoadWorkflows',
  {
    defaultMessage: 'Failed to load workflows. Please check your connector configuration.',
  }
);

export const CREATE_NEW_WORKFLOW = i18n.translate(
  'xpack.stackConnectors.components.workflows.createNewWorkflow',
  {
    defaultMessage: 'Create new',
  }
);
