/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { schema, Type } from '@kbn/config-schema';
import { i18n } from '@kbn/i18n';
import {
  AVAILABLE_THEME_TAGS,
  AVAILABLE_THEME_VERSIONS,
  DEFAULT_THEME_VERSION,
  type UiSettingsParams,
} from '@kbn/core-ui-settings-common';

function parseThemeTags() {
  if (!process.env.KBN_OPTIMIZER_THEMES || process.env.KBN_OPTIMIZER_THEMES === '*') {
    return AVAILABLE_THEME_TAGS;
  }

  return process.env.KBN_OPTIMIZER_THEMES.split(',').map((t) => t.trim());
}

function getThemeInfo(options: GetThemeSettingsOptions) {
  if (options?.isDist ?? true) {
    return {
      defaultDarkMode: false,
      defaultVersion: DEFAULT_THEME_VERSION,
      availableVersions: AVAILABLE_THEME_VERSIONS,
    };
  }

  const themeTags = parseThemeTags();
  return {
    defaultDarkMode: themeTags[0].endsWith('dark'),
    defaultVersion: themeTags[0].slice(0, 2),
    availableVersions: AVAILABLE_THEME_VERSIONS.filter((v) =>
      themeTags.some((t) => t.startsWith(v))
    ),
  };
}

interface GetThemeSettingsOptions {
  isDist?: boolean;
}

export const getThemeSettings = (
  options: GetThemeSettingsOptions = {}
): Record<string, UiSettingsParams> => {
  const { defaultDarkMode, defaultVersion, availableVersions } = getThemeInfo(options);

  const onlyOneThemeAvailable = !options?.isDist && availableVersions.length === 1;

  return {
    'theme:darkMode': {
      name: i18n.translate('core.ui_settings.params.darkModeTitle', {
        defaultMessage: 'Dark mode',
      }),
      value: defaultDarkMode ? 'enabled' : 'disabled',
      description: i18n.translate('core.ui_settings.params.darkModeText', {
        defaultMessage:
          `The UI theme that the Kibana UI should use. ` +
          `Set to 'Enabled' to enable the dark theme, or 'Disabled' to disable it. ` +
          `Set to 'Sync with system' to have the Kibana UI theme follow the system theme. ` +
          `A page reload is required for the setting to be applied.`,
      }),
      type: 'select',
      options: ['enabled', 'disabled', 'system'],
      optionLabels: {
        enabled: i18n.translate('core.ui_settings.params.darkMode.options.enabled', {
          defaultMessage: `Enabled`,
        }),
        disabled: i18n.translate('core.ui_settings.params.darkMode.options.disabled', {
          defaultMessage: `Disabled`,
        }),
        system: i18n.translate('core.ui_settings.params.darkMode.options.system', {
          defaultMessage: `Sync with system`,
        }),
      },
      requiresPageReload: true,
      schema: schema.oneOf([
        schema.literal('enabled'),
        schema.literal('disabled'),
        schema.literal('system'),
        // for backward-compatibility
        schema.boolean(),
      ]),
    },
    /**
     * Theme is sticking around as there are still a number of places reading it and
     * we might use it again in the future.
     */
    'theme:version': {
      name: i18n.translate('core.ui_settings.params.themeVersionTitle', {
        defaultMessage: 'Theme version',
      }),
      value: defaultVersion,
      type: 'select',
      options: availableVersions,
      requiresPageReload: true,
      schema: schema.oneOf(availableVersions.map((v) => schema.literal(v)) as [Type<string>]),
      optionLabels: onlyOneThemeAvailable
        ? {
            [availableVersions[0]]: `${availableVersions[0]} (only)`,
          }
        : {
            v8: i18n.translate('core.ui_settings.params.themeName.options.amsterdam', {
              defaultMessage: 'Amsterdam',
            }),
            borealis: i18n.translate('core.ui_settings.params.themeName.options.borealis', {
              defaultMessage: 'Borealis',
            }),
          },
    },
  };
};
