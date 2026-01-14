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
      // Dark mode layered background: radial light source in center, blue tint in middle, dark gradient base
      const darkModeBackground = [
        'radial-gradient(1200px 800px at 50% 50%, rgba(255, 255, 255, 0), rgba(255, 255, 255, 0.04))', // light source effect
        'linear-gradient(rgba(36, 61, 111, 0.1), rgba(36, 61, 111, 0))', // subtle blue tint
        'linear-gradient(#030812 0%, #0C1626 50%, #0E1621 100%)', // dark gradient base
      ].join(', ');

      // Light mode layered background: subtle blue glow at top center, light gradient base
      const lightModeBackground = [
        'radial-gradient(1200px 800px at 50% 0%, rgba(36, 61, 111, 0.04), rgba(36, 61, 111, 0))',
        'linear-gradient(#F6F9FC, #F4F7FA)',
      ].join(', ');

      return {
        pageBackground: darkMode ? darkModeBackground : lightModeBackground, // colors.body
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

  /* eslint-disable react/no-danger */
  return (
    <style
      dangerouslySetInnerHTML={{
        __html: `

          html {
            background: ${themeStyles.pageBackground};
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
