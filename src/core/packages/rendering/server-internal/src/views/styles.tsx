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
  uiPublicUrl: string;
}

export const Styles: FC<Props> = ({ darkMode, themeName, stylesheetPaths, uiPublicUrl }) => {
  return (
    <>
      {darkMode !== 'system' && (
        <InlineStyles darkMode={darkMode} themeName={themeName} uiPublicUrl={uiPublicUrl} />
      )}
      {stylesheetPaths.map((path) => (
        <link key={path} rel="stylesheet" type="text/css" href={path} />
      ))}
    </>
  );
};

const InlineStyles: FC<{ darkMode: boolean; themeName: ThemeName; uiPublicUrl: string }> = ({
  darkMode,
  themeName,
  uiPublicUrl,
}) => {
  const getThemeStyles = (theme: ThemeName) => {
    if (theme === 'borealis') {
      // Wave pattern images - light pattern for dark mode, dark pattern for light mode
      const wavePatternDark = `url("${uiPublicUrl}/backgrounds/chrome-bg-dark.webp")`;
      const wavePatternLight = `url("${uiPublicUrl}/backgrounds/chrome-bg-light.webp")`;

      // Dark mode layered background: radial light source in center, blue tint, wave pattern, dark gradient base
      const darkModeBackground = [
        'radial-gradient(1200px 800px at 50% 50%, rgba(255, 255, 255, 0), rgba(255, 255, 255, 0.04))', // light source effect
        'linear-gradient(rgba(36, 61, 111, 0.1), rgba(36, 61, 111, 0))', // subtle blue tint
        wavePatternDark,
        'linear-gradient(#07101F 0%, #050D1A 50%, #030A16 100%)', // dark gradient base
      ].join(', ');

      // Light mode layered background: subtle blue glow at top center, wave pattern at bottom, light gradient base
      const lightModeBackground = [
        'radial-gradient(1200px 800px at 50% 0%, rgba(36, 61, 111, 0.04), rgba(36, 61, 111, 0))',
        wavePatternLight,
        'linear-gradient(#F6F9FC, #F4F7FA)',
      ].join(', ');

      return {
        pageBackground: darkMode ? darkModeBackground : lightModeBackground,
        // Dark mode: 4 layers (radial, blue tint, wave, gradient) | Light mode: 3 layers (radial, wave, gradient)
        pageBackgroundSize: darkMode ? 'auto, auto, 100% 600px, auto' : 'auto, 100% 600px, auto',
        pageBackgroundPosition: darkMode ? 'top, top, bottom, top' : 'top, bottom, top',
        pageBackgroundRepeat: 'no-repeat',
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
            background-size: ${themeStyles.pageBackgroundSize};
            background-position: ${themeStyles.pageBackgroundPosition};
            background-repeat: ${themeStyles.pageBackgroundRepeat};
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
