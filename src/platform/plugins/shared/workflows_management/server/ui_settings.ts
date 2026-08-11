/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { schema } from '@kbn/config-schema';
import type { CoreSetup } from '@kbn/core/server';
import { i18n } from '@kbn/i18n';
import {
  WORKFLOWS_EXPERIMENTAL_FEATURES_SETTING_ID,
  WORKFLOWS_GLOBAL_EXECUTIONS_VIEW_ENABLED_SETTING_ID,
  WORKFLOWS_LIBRARY_ENABLED_SETTING_ID,
  WORKFLOWS_UI_SETTING_ID,
  WORKFLOWS_UI_SHOW_MANAGED_WORKFLOWS_SETTING_ID,
} from '@kbn/workflows/common/constants';
import type { WorkflowsServerPluginSetupDeps } from './types';
import { WORKFLOWS_DOCUMENTATION_URL } from '../common';

export const registerUISettings = (
  { uiSettings }: CoreSetup,
  plugins: WorkflowsServerPluginSetupDeps
) => {
  let licenseText = '';

  if (!plugins.serverless) {
    licenseText = i18n.translate('workflowsManagement.uiSettings.ui.licenseText', {
      defaultMessage: 'Requires {license} license.',
      values: { license: '<b>enterprise</b>' },
    });
  }

  uiSettings.register({
    [WORKFLOWS_UI_SETTING_ID]: {
      description: i18n.translate('workflowsManagement.uiSettings.ui.description', {
        defaultMessage:
          'Enables Elastic Workflows and related experiences. {licenseText} {learnMoreLink}',
        values: {
          learnMoreLink: `<a href="${WORKFLOWS_DOCUMENTATION_URL}" target="_blank" rel="noreferrer noopener">${i18n.translate(
            'workflowsManagement.uiSettings.ui.learnMore',
            { defaultMessage: 'Learn more' }
          )}</a>.`,
          licenseText,
        },
      }),
      name: i18n.translate('workflowsManagement.uiSettings.ui.name', {
        defaultMessage: 'Elastic Workflows',
      }),
      schema: schema.boolean(),
      value: true,
      readonly: false,
      requiresPageReload: true,
      category: ['workflows'],
    },
    [WORKFLOWS_UI_SHOW_MANAGED_WORKFLOWS_SETTING_ID]: {
      description: i18n.translate(
        'workflowsManagement.uiSettings.showManagedWorkflows.description',
        {
          defaultMessage:
            'Allows users with the required workflow privileges to display managed workflows and their executions in workflow experiences. ' +
            'Managed workflows are maintained by Elastic and power certain functionality. ' +
            'Editing, disabling, or deleting them may cause unexpected behavior or break product functionality.',
        }
      ),
      name: i18n.translate('workflowsManagement.uiSettings.showManagedWorkflows.name', {
        defaultMessage: 'Show managed workflows',
      }),
      schema: schema.boolean(),
      value: false,
      readonly: false,
      category: ['workflows'],
    },
    [WORKFLOWS_EXPERIMENTAL_FEATURES_SETTING_ID]: {
      description: i18n.translate(
        'workflowsManagement.uiSettings.experimentalFeatures.description',
        {
          defaultMessage: 'Enables experimental features for Elastic Workflows.',
        }
      ),
      name: i18n.translate('workflowsManagement.uiSettings.experimentalFeatures.name', {
        defaultMessage: 'Elastic Workflows: Experimental Features',
      }),
      schema: schema.boolean(),
      value: false,
      experimental: true,
      requiresPageReload: true,
      readonly: false,
      category: ['workflows'],
    },
  });

  uiSettings.registerGlobal({
    [WORKFLOWS_LIBRARY_ENABLED_SETTING_ID]: {
      name: i18n.translate('workflowsManagement.uiSettings.libraryEnabled.name', {
        defaultMessage: 'Workflow Template Library',
      }),
      description: i18n.translate('workflowsManagement.uiSettings.libraryEnabled.description', {
        defaultMessage: 'Enables the Workflow Template Library.',
      }),
      schema: schema.boolean(),
      value: false,
      readonly: true,
      readonlyMode: 'ui',
      requiresPageReload: true,
    },
    [WORKFLOWS_GLOBAL_EXECUTIONS_VIEW_ENABLED_SETTING_ID]: {
      name: i18n.translate('workflowsManagement.uiSettings.globalExecutionsViewEnabled.name', {
        defaultMessage: 'Workflow Executions view',
      }),
      description: i18n.translate(
        'workflowsManagement.uiSettings.globalExecutionsViewEnabled.description',
        {
          defaultMessage: 'Enables the global Workflow Executions view.',
        }
      ),
      schema: schema.boolean(),
      value: false,
      readonly: true,
      readonlyMode: 'ui',
      requiresPageReload: true,
    },
  });
};
