/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { schema } from '@kbn/config-schema';
import { i18n } from '@kbn/i18n';
import type { Writable } from '@kbn/utility-types';
import type { ThemeVersion } from '@kbn/ui-shared-deps-npm';
import {
  type UiSettingsParams,
  type ThemeName,
  parseThemeTags,
  SUPPORTED_THEME_NAMES,
  DEFAULT_THEME_NAME,
} from '@kbn/core-ui-settings-common';
import { defaultThemeSchema } from '../ui_settings_config';

interface ThemeInfo {
  defaultDarkMode: boolean;
}

const getThemeInfo = ({ isDist }: GetThemeSettingsOptions): ThemeInfo => {
  const themeTags = parseThemeTags(process.env.KBN_OPTIMIZER_THEMES);

  const themeInfo: ThemeInfo = {
    defaultDarkMode: false,
  };

  if (!isDist) {
    // Allow environment-specific config when not building for distribution
    themeInfo.defaultDarkMode = themeTags[0]?.endsWith('dark') || false;
  }

  return themeInfo;
};

export interface GetThemeSettingsOptions {
  isDist: boolean;
  isThemeSwitcherEnabled: boolean | undefined;
  defaultTheme?: ThemeName;
}

export const getThemeSettings = (
  options: GetThemeSettingsOptions
): Record<string, UiSettingsParams> => {
  const { defaultDarkMode } = getThemeInfo(options);
  const defaultTheme = options.defaultTheme ?? DEFAULT_THEME_NAME;

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
      deprecation: {
        message: i18n.translate('core.ui_settings.params.darkModeDeprecation', {
          defaultMessage: 'This setting is deprecated and will be removed in Kibana 10.0.',
        }),
        docLinksKey: 'generalSettings',
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
      value: 'v8' as ThemeVersion,
      readonly: true,
      schema: schema.literal('v8'),
    },
    /**
     * Theme name is the (upcoming) replacement for theme versions.
     */
    'theme:name': {
      name: i18n.translate('core.ui_settings.params.themeName', {
        defaultMessage: 'Theme',
      }),
      type: 'select',
      // Cast to a mutable array to satisfy the `UiSettingsParams.options` type
      options: SUPPORTED_THEME_NAMES as Writable<typeof SUPPORTED_THEME_NAMES>,
      optionLabels: {
        amsterdam: i18n.translate('core.ui_settings.params.themeName.options.amsterdam', {
          defaultMessage: 'Amsterdam',
        }),
        borealis: i18n.translate('core.ui_settings.params.themeName.options.borealis', {
          defaultMessage: 'Borealis',
        }),
      },
      value: defaultTheme,
      readonly: !options.isThemeSwitcherEnabled,
      requiresPageReload: true,
      schema: defaultThemeSchema,
    },
  };
};
