/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import { schema } from '@kbn/config-schema';
import { SETTING_CATEGORY } from '../../../../src/plugins/presentation_util/server';
import { UiSettingsParams } from '../../../../src/core/types';
import { UI_SETTINGS } from '../common';

/**
 * uiSettings definitions for Dashboard.
 */
export const getUISettings = (): Record<string, UiSettingsParams<boolean>> => ({
  [UI_SETTINGS.ENABLE_LABS_UI]: {
    name: i18n.translate('dashboard.labs.enableUI', {
      defaultMessage: 'Enable labs button in Dashboard',
    }),
    description: i18n.translate('dashboard.labs.enableLabsDescription', {
      defaultMessage:
        'This flag determines if the viewer has access to the Labs button, a quick way to enable and disable technical preview features in Dashboard.',
    }),
    value: false,
    type: 'boolean',
    schema: schema.boolean(),
    category: [SETTING_CATEGORY],
    requiresPageReload: true,
  },
});
