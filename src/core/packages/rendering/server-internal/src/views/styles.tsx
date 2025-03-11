/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { FC } from 'react';
import { type DarkModeValue, ThemeName } from '@kbn/core-ui-settings-common';

interface Props {
  darkMode: DarkModeValue;
  themeName: ThemeName;
  stylesheetPaths: string[];
}

export const Styles: FC<Props> = ({ darkMode, themeName, stylesheetPaths }) => {
  return (
    <>
      {darkMode !== 'system' && <InlineStyles darkMode={darkMode} themeName={themeName} />}
      {stylesheetPaths.map((path) => (
        <link key={path} rel="stylesheet" type="text/css" href={path} />
      ))}
    </>
  );
};

const InlineStyles: FC<{ darkMode: boolean; themeName: ThemeName }> = ({ darkMode, themeName }) => {
  const getThemeStyles = (theme: ThemeName) => {
    if (theme === 'borealis') {
      return {
        pageBackground: darkMode ? '#07101F' : '#F6F9FC', // colors.body
        welcomeText: darkMode ? '#8E9FBC' : '#5A6D8C', // colors.subduedText
        progress: darkMode ? '#172336' : '#ECF1F9', // colors.lightestShade
        progressBefore: darkMode ? '#599DFF' : '#0B64DD', // colors.primary
      };
    }

    return {
      pageBackground: darkMode ? '#141519' : '#F8FAFD',
      welcomeText: darkMode ? '#98A2B3' : '#69707D',
      progress: darkMode ? '#25262E' : '#F5F7FA',
      progressBefore: darkMode ? '#1BA9F5' : '#006DE4',
    };
  };

  const themeStyles = getThemeStyles(themeName);

  // must be kept in sync with
  // src/core/packages/apps/server-internal/assets/legacy_theme.js
  /* eslint-disable react/no-danger */
  return (
    <style
      dangerouslySetInnerHTML={{
        __html: `

          html {
            background-color: ${themeStyles.pageBackground}
          }

          .kbnWelcomeText {
            color: ${themeStyles.welcomeText};
          }

          .kbnProgress {
            background-color: ${themeStyles.progress};
          }

          .kbnProgress:before {
            background-color: ${themeStyles.progressBefore};
          }

        `,
      }}
    />
  );
  /* eslint-enable react/no-danger */
};
