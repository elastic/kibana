/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { schema } from '@kbn/config-schema';
import { UiSettingsParams } from '@kbn/core/types';
import { i18n } from '@kbn/i18n';

import { DEV_TOOLS_FEATURE_ID, ENABLE_PERSISTENT_CONSOLE_UI_SETTING_ID } from '../common/constants';

/**
 * uiSettings definitions for Dev Tools
 */
export const uiSettings: Record<string, UiSettingsParams<boolean>> = {
  [ENABLE_PERSISTENT_CONSOLE_UI_SETTING_ID]: {
    category: [DEV_TOOLS_FEATURE_ID],
    description: i18n.translate('devTools.uiSettings.persistentConsole.description', {
      defaultMessage:
        'Enables a persistent console in the Kibana UI. This setting does not affect the standard Console in Dev Tools.',
    }),
    name: i18n.translate('devTools.uiSettings.persistentConsole.name', {
      defaultMessage: 'Persistent Console',
    }),
    requiresPageReload: true,
    schema: schema.boolean(),
    value: true,
  },
};
