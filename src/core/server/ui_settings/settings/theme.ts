/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { schema } from '@kbn/config-schema';
import { i18n } from '@kbn/i18n';
import { UiSettingsParams } from '../../../types';

export const getThemeSettings = (): Record<string, UiSettingsParams> => {
  return {
    'theme:darkMode': {
      name: i18n.translate('core.ui_settings.params.darkModeTitle', {
        defaultMessage: 'Dark mode',
      }),
      value: false,
      description: i18n.translate('core.ui_settings.params.darkModeText', {
        defaultMessage: `Enable a dark mode for the Kibana UI. A page refresh is required for the setting to be applied.`,
      }),
      requiresPageReload: true,
      schema: schema.boolean(),
    },
    'theme:version': {
      name: i18n.translate('core.ui_settings.params.themeVersionTitle', {
        defaultMessage: 'Theme version',
      }),
      value: 'v7',
      type: 'select',
      options: ['v7', 'v8 (beta)'],
      description: i18n.translate('core.ui_settings.params.themeVersionText', {
        defaultMessage: `Switch between the theme used for the current and next version of Kibana. A page refresh is required for the setting to be applied.`,
      }),
      requiresPageReload: true,
      schema: schema.oneOf([schema.literal('v7'), schema.literal('v8 (beta)')]),
    },
  };
};
