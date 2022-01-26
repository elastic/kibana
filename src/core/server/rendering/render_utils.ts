/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import UiSharedDepsNpm from '@kbn/ui-shared-deps-npm';
import * as UiSharedDepsSrc from '@kbn/ui-shared-deps-src';
import { PublicUiSettingsParams, UserProvidedValues } from '../ui_settings';

export const getSettingValue = <T>(
  settingName: string,
  settings: {
    user?: Record<string, UserProvidedValues<unknown>>;
    defaults: Readonly<Record<string, PublicUiSettingsParams>>;
  },
  convert: (raw: unknown) => T
): T => {
  const value = settings.user?.[settingName]?.userValue ?? settings.defaults[settingName].value;
  return convert(value);
};

export const getStylesheetPaths = ({
  themeVersion,
  darkMode,
  basePath,
  buildNum,
}: {
  themeVersion: UiSharedDepsNpm.ThemeVersion;
  darkMode: boolean;
  buildNum: number;
  basePath: string;
}) => {
  const regularBundlePath = `${basePath}/${buildNum}/bundles`;
  return [
    ...(darkMode
      ? [
          `${regularBundlePath}/kbn-ui-shared-deps-npm/${UiSharedDepsNpm.darkCssDistFilename(
            themeVersion
          )}`,
          `${regularBundlePath}/kbn-ui-shared-deps-src/${UiSharedDepsSrc.cssDistFilename}`,
          `${basePath}/node_modules/@kbn/ui-framework/dist/kui_dark.css`,
          `${basePath}/ui/legacy_dark_theme.css`,
        ]
      : [
          `${regularBundlePath}/kbn-ui-shared-deps-npm/${UiSharedDepsNpm.lightCssDistFilename(
            themeVersion
          )}`,
          `${regularBundlePath}/kbn-ui-shared-deps-src/${UiSharedDepsSrc.cssDistFilename}`,
          `${basePath}/node_modules/@kbn/ui-framework/dist/kui_light.css`,
          `${basePath}/ui/legacy_light_theme.css`,
        ]),
  ];
};
