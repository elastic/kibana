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
  WORKFLOWS_AI_AGENT_SETTING_ID,
  WORKFLOWS_UI_SETTING_ID,
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
      value: false,
      readonly: false,
      technicalPreview: true,
      requiresPageReload: true,
      category: ['general'],
    },
    [WORKFLOWS_AI_AGENT_SETTING_ID]: {
      description: i18n.translate('workflowsManagement.uiSettings.aiAgent.description', {
        defaultMessage:
          'Enables AI-powered workflow authoring experiences. {licenseText} {learnMoreLink}',
        values: {
          learnMoreLink: `<a href="${WORKFLOWS_DOCUMENTATION_URL}" target="_blank" rel="noreferrer noopener">${i18n.translate(
            'workflowsManagement.uiSettings.aiAgent.learnMore',
            { defaultMessage: 'Learn more' }
          )}</a>.`,
          licenseText,
        },
      }),
      name: i18n.translate('workflowsManagement.uiSettings.aiAgent.name', {
        defaultMessage: 'Elastic Workflows: AI agent authoring',
      }),
      schema: schema.boolean(),
      value: false,
      readonly: false,
      technicalPreview: true,
      requiresPageReload: true,
      category: ['general'],
    },
  });
};
