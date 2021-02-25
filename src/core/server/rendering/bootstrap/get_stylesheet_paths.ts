/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import * as UiSharedDeps from '@kbn/ui-shared-deps';

export const getStylesheetPaths = ({
  themeVersion,
  darkMode,
  basePath,
  regularBundlePath,
}: {
  themeVersion: string;
  darkMode: boolean;
  regularBundlePath: string;
  basePath: string;
}) => {
  return [
    `${regularBundlePath}/kbn-ui-shared-deps/${UiSharedDeps.baseCssDistFilename}`,
    ...(darkMode
      ? [
          themeVersion === 'v7'
            ? `${regularBundlePath}/kbn-ui-shared-deps/${UiSharedDeps.darkCssDistFilename}`
            : `${regularBundlePath}/kbn-ui-shared-deps/${UiSharedDeps.darkV8CssDistFilename}`,
          `${basePath}/node_modules/@kbn/ui-framework/dist/kui_dark.css`,
          `${basePath}/ui/legacy_dark_theme.css`,
        ]
      : [
          themeVersion === 'v7'
            ? `${regularBundlePath}/kbn-ui-shared-deps/${UiSharedDeps.lightCssDistFilename}`
            : `${regularBundlePath}/kbn-ui-shared-deps/${UiSharedDeps.lightV8CssDistFilename}`,
          `${basePath}/node_modules/@kbn/ui-framework/dist/kui_light.css`,
          `${basePath}/ui/legacy_light_theme.css`,
        ]),
  ];
};
