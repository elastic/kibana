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
    defaultMessage: 'Select Workflow',
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

export const FILTER_WORKFLOWS_PLACEHOLDER = i18n.translate(
  'xpack.stackConnectors.components.workflows.filterWorkflowsPlaceholder',
  {
    defaultMessage: 'Filter workflows',
  }
);

export const WORKFLOW_DISABLED_WARNING = i18n.translate(
  'xpack.stackConnectors.components.workflows.workflowDisabledWarning',
  {
    defaultMessage: 'This workflow is currently disabled',
  }
);

export const DISABLED_BADGE_LABEL = i18n.translate(
  'xpack.stackConnectors.components.workflows.disabledBadgeLabel',
  {
    defaultMessage: 'Disabled',
  }
);

export const SELECTED_WORKFLOW_DISABLED_ERROR = i18n.translate(
  'xpack.stackConnectors.components.workflows.selectedWorkflowDisabledError',
  {
    defaultMessage:
      'The previously selected workflow is no longer available. Please select a different workflow.',
  }
);

export const OPEN_WORKFLOW_LINK = i18n.translate(
  'xpack.stackConnectors.components.workflows.openWorkflowLink',
  {
    defaultMessage: 'Open workflow',
  }
);

export const DISABLED_WORKFLOW_TOOLTIP = i18n.translate(
  'xpack.stackConnectors.components.workflows.disabledWorkflowTooltip',
  {
    defaultMessage: 'Disabled workflow',
  }
);

export const EMPTY_STATE_TITLE = i18n.translate(
  'xpack.stackConnectors.components.workflows.emptyStateTitle',
  {
    defaultMessage: "You don't have any workflows yet",
  }
);

export const EMPTY_STATE_DESCRIPTION = i18n.translate(
  'xpack.stackConnectors.components.workflows.emptyStateDescription',
  {
    defaultMessage: 'Workflows help you automate and streamline tasks.',
  }
);

export const EMPTY_STATE_BUTTON_TEXT = i18n.translate(
  'xpack.stackConnectors.components.workflows.emptyStateButtonText',
  {
    defaultMessage: 'Create your first workflow',
  }
);
