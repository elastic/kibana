/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { FC } from 'react';
import React from 'react';
import type { ThemeName } from '@kbn/core-ui-settings-common';
import { type DarkModeValue } from '@kbn/core-ui-settings-common';

interface Props {
  darkMode: DarkModeValue;
  themeName: ThemeName;
  stylesheetPaths: string[];
}

export const Styles: FC<Props> = ({ darkMode, themeName, stylesheetPaths }) => {
  return (
    <>
      <InlineStyles darkMode={darkMode} themeName={themeName} />
      {stylesheetPaths.map((path) => (
        <link key={path} rel="stylesheet" type="text/css" href={path} />
      ))}
    </>
  );
};

interface SplashColors {
  pageBackground: string;
  welcomeText: string;
  progress: string;
  progressBefore: string;
}

const getThemeStyles = (theme: ThemeName): { light: SplashColors; dark: SplashColors } => {
  if (theme === 'borealis') {
    return {
      light: {
        pageBackground: '#F6F9FC', // colors.body
        welcomeText: '#5A6D8C', // colors.subduedText
        progress: '#ECF1F9', // colors.lightestShade
        progressBefore: '#0B64DD', // colors.primary
      },
      dark: {
        pageBackground: '#07101F',
        welcomeText: '#8E9FBC',
        progress: '#172336',
        progressBefore: '#599DFF',
      },
    };
  }

  return {
    light: {
      pageBackground: '#F8FAFD',
      welcomeText: '#69707D',
      progress: '#F5F7FA',
      progressBefore: '#006DE4',
    },
    dark: {
      pageBackground: '#141519',
      welcomeText: '#98A2B3',
      progress: '#25262E',
      progressBefore: '#1BA9F5',
    },
  };
};

const splashRules = (colors: SplashColors) => `
          html {
            background-color: ${colors.pageBackground};
          }

          .kbnWelcomeText {
            color: ${colors.welcomeText};
          }

          .kbnProgress {
            background-color: ${colors.progress};
          }

          .kbnProgress:before {
            background-color: ${colors.progressBefore};
          }
`;

const InlineStyles: FC<{ darkMode: DarkModeValue; themeName: ThemeName }> = ({
  darkMode,
  themeName,
}) => {
  const { light, dark } = getThemeStyles(themeName);

  // For `system` we can't know the OS preference at render time, so inline both
  // variants and let the CSS engine pick via `@media (prefers-color-scheme)`.
  // This resolves the correct splash colors at first paint — no JS round-trip and
  // no flash-of-light before the dark theme is applied.
  const css =
    darkMode === 'system'
      ? `${splashRules(light)}
          @media (prefers-color-scheme: dark) {
            ${splashRules(dark)}
          }`
      : splashRules(darkMode ? dark : light);

  /* eslint-disable react/no-danger */
  return <style dangerouslySetInnerHTML={{ __html: css }} />;
  /* eslint-enable react/no-danger */
};
