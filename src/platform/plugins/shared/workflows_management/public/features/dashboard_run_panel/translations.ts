/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';
import type { WorkflowPrivilege } from './lib/get_panel_status';

export const PANEL_DISPLAY_NAME = i18n.translate('workflows.dashboardRunPanel.displayName', {
  defaultMessage: 'Run workflow',
});

export const PANEL_TYPE_DISPLAY_NAME = i18n.translate(
  'workflows.dashboardRunPanel.typeDisplayName',
  { defaultMessage: 'workflow' }
);

export const DEFAULT_BUTTON_LABEL = i18n.translate(
  'workflows.dashboardRunPanel.defaultButtonLabel',
  { defaultMessage: 'Run workflow' }
);

export const PRIVILEGE_LABELS: Record<WorkflowPrivilege, string> = {
  read: i18n.translate('workflows.dashboardRunPanel.privilege.read', {
    defaultMessage: 'read workflows',
  }),
  execute: i18n.translate('workflows.dashboardRunPanel.privilege.execute', {
    defaultMessage: 'run workflows',
  }),
  readExecution: i18n.translate('workflows.dashboardRunPanel.privilege.readExecution', {
    defaultMessage: 'read workflow executions',
  }),
};

export const STATUS_MESSAGES = {
  notFoundTitle: i18n.translate('workflows.dashboardRunPanel.status.notFoundTitle', {
    defaultMessage: 'Workflow not found',
  }),
  notFoundBody: i18n.translate('workflows.dashboardRunPanel.status.notFoundBody', {
    defaultMessage:
      'The workflow this panel runs was deleted, or it is in a different space. Edit the panel to choose another workflow.',
  }),
  missingPrivilegesTitle: i18n.translate(
    'workflows.dashboardRunPanel.status.missingPrivilegesTitle',
    { defaultMessage: 'You cannot run this workflow' }
  ),
  missingPrivilegesBody: (privileges: string) =>
    i18n.translate('workflows.dashboardRunPanel.status.missingPrivilegesBody', {
      defaultMessage: 'Your role is missing the Workflows privileges to {privileges}.',
      values: { privileges },
    }),
  notRunnableByUser: i18n.translate('workflows.dashboardRunPanel.status.notRunnableByUser', {
    defaultMessage: 'The workflow owner has not given you permission to run this workflow.',
  }),
  disabled: i18n.translate('workflows.dashboardRunPanel.status.disabled', {
    defaultMessage: 'This workflow is disabled. Enable it to run it from the dashboard.',
  }),
  invalid: i18n.translate('workflows.dashboardRunPanel.status.invalid', {
    defaultMessage: 'This workflow has errors in its definition and cannot run.',
  }),
  noManualTrigger: i18n.translate('workflows.dashboardRunPanel.status.noManualTrigger', {
    defaultMessage: 'This workflow has no manual trigger, so it cannot be run from a dashboard.',
  }),
  loadFailedTitle: i18n.translate('workflows.dashboardRunPanel.status.loadFailedTitle', {
    defaultMessage: 'Could not load the workflow',
  }),
};

export const RUN_MESSAGES = {
  lastRun: i18n.translate('workflows.dashboardRunPanel.lastRun', {
    defaultMessage: 'Last run',
  }),
  neverRun: i18n.translate('workflows.dashboardRunPanel.neverRun', {
    defaultMessage: 'Not run yet',
  }),
  viewExecution: i18n.translate('workflows.dashboardRunPanel.viewExecution', {
    defaultMessage: 'View execution',
  }),
  openLastRun: i18n.translate('workflows.dashboardRunPanel.openLastRun', {
    defaultMessage: 'Open the last run of this workflow',
  }),
  running: i18n.translate('workflows.dashboardRunPanel.running', {
    defaultMessage: 'Running…',
  }),
  startedToastTitle: (name: string) =>
    i18n.translate('workflows.dashboardRunPanel.startedToastTitle', {
      defaultMessage: '{name} started',
      values: { name },
    }),
  runFailedToastTitle: (name: string) =>
    i18n.translate('workflows.dashboardRunPanel.runFailedToastTitle', {
      defaultMessage: 'Could not run {name}',
      values: { name },
    }),
};

export const CONFIRM_MESSAGES = {
  fromDashboard: (inputs: string) =>
    i18n.translate('workflows.dashboardRunPanel.confirm.fromDashboard', {
      defaultMessage:
        'Prefilled from the dashboard: {inputs}. The workflow runs with your privileges.',
      values: { inputs },
    }),
  toFill: (inputs: string) =>
    i18n.translate('workflows.dashboardRunPanel.confirm.toFill', {
      defaultMessage: 'Fill in before running: {inputs}.',
      values: { inputs },
    }),
  runsAs: i18n.translate('workflows.dashboardRunPanel.confirm.runsAs', {
    defaultMessage: 'The workflow runs with your privileges.',
  }),
  issuesTitle: i18n.translate('workflows.dashboardRunPanel.confirm.issuesTitle', {
    defaultMessage: 'Some values could not be read from the dashboard',
  }),
  invalidJson: i18n.translate('workflows.dashboardRunPanel.confirm.invalidJson', {
    defaultMessage: 'Enter valid JSON',
  }),
};

export const SOURCE_LABELS = {
  prompt: i18n.translate('workflows.dashboardRunPanel.source.prompt', {
    defaultMessage: 'Ask when run',
  }),
  control: i18n.translate('workflows.dashboardRunPanel.source.control', {
    defaultMessage: 'Dashboard control',
  }),
  time_range: i18n.translate('workflows.dashboardRunPanel.source.timeRange', {
    defaultMessage: 'Dashboard time range',
  }),
  query: i18n.translate('workflows.dashboardRunPanel.source.query', {
    defaultMessage: 'Dashboard query and filters',
  }),
  constant: i18n.translate('workflows.dashboardRunPanel.source.constant', {
    defaultMessage: 'Fixed value',
  }),
  timeFrom: i18n.translate('workflows.dashboardRunPanel.source.timeFrom', {
    defaultMessage: 'Start',
  }),
  timeTo: i18n.translate('workflows.dashboardRunPanel.source.timeTo', {
    defaultMessage: 'End',
  }),
};

export const CONFIG_MESSAGES = {
  createTitle: i18n.translate('workflows.dashboardRunPanel.config.createTitle', {
    defaultMessage: 'Add a Run workflow panel',
  }),
  editTitle: i18n.translate('workflows.dashboardRunPanel.config.editTitle', {
    defaultMessage: 'Edit Run workflow panel',
  }),
  workflow: i18n.translate('workflows.dashboardRunPanel.config.workflow', {
    defaultMessage: 'Workflow',
  }),
  workflowHelp: i18n.translate('workflows.dashboardRunPanel.config.workflowHelp', {
    defaultMessage: 'Only workflows with a manual trigger are listed.',
  }),
  buttonLabel: i18n.translate('workflows.dashboardRunPanel.config.buttonLabel', {
    defaultMessage: 'Button label',
  }),
  inputsTitle: i18n.translate('workflows.dashboardRunPanel.config.inputsTitle', {
    defaultMessage: 'Inputs',
  }),
  inputsHelp: i18n.translate('workflows.dashboardRunPanel.config.inputsHelp', {
    defaultMessage:
      'Choose where each input gets its value when someone runs the workflow. They confirm the values before it runs.',
  }),
  noInputs: i18n.translate('workflows.dashboardRunPanel.config.noInputs', {
    defaultMessage: 'This workflow takes no inputs.',
  }),
  source: i18n.translate('workflows.dashboardRunPanel.config.source', {
    defaultMessage: 'Value from',
  }),
  control: i18n.translate('workflows.dashboardRunPanel.config.control', {
    defaultMessage: 'Control',
  }),
  noControls: i18n.translate('workflows.dashboardRunPanel.config.noControls', {
    defaultMessage: 'This dashboard has no controls',
  }),
  timePart: i18n.translate('workflows.dashboardRunPanel.config.timePart', {
    defaultMessage: 'Part of the range',
  }),
  value: i18n.translate('workflows.dashboardRunPanel.config.value', {
    defaultMessage: 'Value',
  }),
  required: i18n.translate('workflows.dashboardRunPanel.config.required', {
    defaultMessage: 'required',
  }),
  save: i18n.translate('workflows.dashboardRunPanel.config.save', { defaultMessage: 'Save' }),
  cancel: i18n.translate('workflows.dashboardRunPanel.config.cancel', {
    defaultMessage: 'Cancel',
  }),
  chooseControl: i18n.translate('workflows.dashboardRunPanel.config.chooseControl', {
    defaultMessage: 'Choose a control',
  }),
};
