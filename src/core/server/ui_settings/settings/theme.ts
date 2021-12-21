/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { schema } from '@kbn/config-schema';
import { i18n } from '@kbn/i18n';
import type { ThemeVersion } from '@kbn/ui-shared-deps-npm';
import { UiSettingsParams } from '../../../types';

function parseThemeTags() {
  if (!process.env.KBN_OPTIMIZER_THEMES || process.env.KBN_OPTIMIZER_THEMES === '*') {
    return ['v8light', 'v8dark'];
  }

  return process.env.KBN_OPTIMIZER_THEMES.split(',').map((t) => t.trim());
}

function getThemeInfo(options: GetThemeSettingsOptions) {
  if (options?.isDist ?? true) {
    return {
      defaultDarkMode: false,
    };
  }

  const themeTags = parseThemeTags();
  return {
    defaultDarkMode: themeTags[0].endsWith('dark'),
  };
}

interface GetThemeSettingsOptions {
  isDist?: boolean;
}

export const getThemeSettings = (
  options: GetThemeSettingsOptions = {}
): Record<string, UiSettingsParams> => {
  const { defaultDarkMode } = getThemeInfo(options);

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
    /**
     * Theme is sticking around as there are still a number of places reading it and
     * we might use it again in the future.
     */
    'theme:version': {
      name: i18n.translate('core.ui_settings.params.themeVersionTitle', {
        defaultMessage: 'Theme version',
      }),
      value: 'v8' as ThemeVersion,
      readonly: true,
      schema: schema.literal('v8'),
    },
  };
};
