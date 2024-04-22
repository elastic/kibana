/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { firstValueFrom } from 'rxjs';
import UiSharedDepsNpm from '@kbn/ui-shared-deps-npm';
import * as UiSharedDepsSrc from '@kbn/ui-shared-deps-src';
import type { IConfigService } from '@kbn/config';
import type { BrowserLoggingConfig } from '@kbn/core-logging-common-internal';
import type { UiSettingsParams, UserProvidedValues } from '@kbn/core-ui-settings-common';
import {
  config as loggingConfigDef,
  type LoggingConfigWithBrowserType,
} from '@kbn/core-logging-server-internal';
import type { DarkModeValue } from '@kbn/core-ui-settings-common';

export const getSettingValue = <T>(
  settingName: string,
  settings: {
    user?: Record<string, UserProvidedValues<unknown>>;
    defaults: Readonly<Record<string, Omit<UiSettingsParams, 'schema'>>>;
  },
  convert: (raw: unknown) => T
): T => {
  const value = settings.user?.[settingName]?.userValue ?? settings.defaults[settingName].value;
  return convert(value);
};

export const getBundlesHref = (baseHref: string): string => `${baseHref}/bundles`;

export const getScriptPaths = ({
  baseHref,
  darkMode,
}: {
  baseHref: string;
  darkMode: DarkModeValue;
}) => {
  if (darkMode === 'system') {
    return [`${baseHref}/ui/legacy_theme.js`];
  } else {
    return [];
  }
};

export const getCommonStylesheetPaths = ({ baseHref }: { baseHref: string }) => {
  const bundlesHref = getBundlesHref(baseHref);
  return [
    `${bundlesHref}/kbn-ui-shared-deps-src/${UiSharedDepsSrc.cssDistFilename}`,
    `${baseHref}/ui/legacy_styles.css`,
  ];
};

export const getThemeStylesheetPaths = ({
  darkMode,
  themeVersion,
  baseHref,
}: {
  darkMode: boolean;
  themeVersion: UiSharedDepsNpm.ThemeVersion;
  baseHref: string;
}) => {
  const bundlesHref = getBundlesHref(baseHref);
  return [
    ...(darkMode
      ? [
          `${bundlesHref}/kbn-ui-shared-deps-npm/${UiSharedDepsNpm.darkCssDistFilename(
            themeVersion
          )}`,
          `${baseHref}/ui/legacy_dark_theme.min.css`,
        ]
      : [
          `${bundlesHref}/kbn-ui-shared-deps-npm/${UiSharedDepsNpm.lightCssDistFilename(
            themeVersion
          )}`,
          `${baseHref}/ui/legacy_light_theme.min.css`,
        ]),
  ];
};

export const getBrowserLoggingConfig = async (
  configService: IConfigService
): Promise<BrowserLoggingConfig> => {
  const loggingConfig = await firstValueFrom(
    configService.atPath<LoggingConfigWithBrowserType>(loggingConfigDef.path)
  );
  return loggingConfig.browser;
};
