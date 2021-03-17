/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { schema, Type } from '@kbn/config-schema';
import { i18n } from '@kbn/i18n';
import { UiSettingsParams } from '../../../types';

function parseThemeTags() {
  if (!process.env.KBN_OPTIMIZER_THEMES) {
    return ['v8light', 'v8dark'];
  }

  if (process.env.KBN_OPTIMIZER_THEMES === '*') {
    return ['v8light', 'v8dark', 'v7light', 'v7dark'];
  }

  return process.env.KBN_OPTIMIZER_THEMES.split(',').map((t) => t.trim());
}

interface GetThemeSettingsOptions {
  isDist?: boolean;
}

export const getThemeSettings = (
  options: GetThemeSettingsOptions = {}
): Record<string, UiSettingsParams> => {
  const isDist = options?.isDist ?? true;

  const themeTags = parseThemeTags();
  const availableVersions = ['v7', 'v8'].filter(
    (v) => isDist || themeTags.some((t) => t.startsWith(v))
  );

  const defaultDarkMode = isDist ? false : themeTags[0].endsWith('dark');
  const defaultVersion = isDist ? 'v8' : themeTags[0].slice(0, 2);

  return {
    'theme:darkMode': {
      name: i18n.translate('core.ui_settings.params.darkModeTitle', {
        defaultMessage: 'Dark mode',
      }),
      value: defaultDarkMode,
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
      value: defaultVersion,
      type: 'select',
      options: availableVersions,
      description: i18n.translate('core.ui_settings.params.themeVersionText', {
        defaultMessage: `Switch between the theme used for the current and next version of Kibana. A page refresh is required for the setting to be applied.`,
      }),
      requiresPageReload: true,
      schema: schema.oneOf(availableVersions.map((v) => schema.literal(v)) as [Type<string>]),
    },
  };
};
