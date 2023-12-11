/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import UiSharedDepsNpm from '@kbn/ui-shared-deps-npm';
import * as UiSharedDepsSrc from '@kbn/ui-shared-deps-src';
import type { UiSettingsParams, UserProvidedValues } from '@kbn/core-ui-settings-common';

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

export const getBundlesHref = (baseHref: string, buildNr: string): string =>
  `${baseHref}/${buildNr}/bundles`;

export const getCommonStylesheetPaths = ({
  baseHref,
  buildNum,
}: {
  buildNum: number;
  baseHref: string;
}) => {
  const bundlesHref = getBundlesHref(baseHref, String(buildNum));
  return [`${bundlesHref}/kbn-ui-shared-deps-src/${UiSharedDepsSrc.cssDistFilename}`];
};

export const getDarkModeStylesheetPaths =
  ({
    themeVersion,
    baseHref,
    buildNum,
  }: {
    themeVersion: UiSharedDepsNpm.ThemeVersion;
    buildNum: number;
    baseHref: string;
  }) =>
  ({ darkMode }: { darkMode: boolean }) => {
    const bundlesHref = getBundlesHref(baseHref, String(buildNum));
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
