/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { schema } from '@kbn/config-schema';
import type { UiSettingsServiceSetup } from '@kbn/core-ui-settings-server';
import { i18n } from '@kbn/i18n';
import { WORKFLOWS_UI_SETTING_ID } from '@kbn/workflows/common/constants';

export const registerUISettings = ({ uiSettings }: { uiSettings: UiSettingsServiceSetup }) => {
  uiSettings.register({
    [WORKFLOWS_UI_SETTING_ID]: {
      description: i18n.translate('workflowsManagement.uiSettings.ui.description', {
        defaultMessage: 'Enables the workflows management UI for creating and managing workflows.',
      }),
      name: i18n.translate('workflowsManagement.uiSettings.ui.name', {
        defaultMessage: 'Workflows Management UI',
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
