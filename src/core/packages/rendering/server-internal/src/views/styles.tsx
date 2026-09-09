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

interface BootPageColors {
  pageBackground: string;
  welcomeText: string;
  progress: string;
  progressBefore: string;
  errorTitleText: string;
  errorBodyText: string;
  errorButtonBackground: string;
  errorButtonText: string;
}

const getThemeStyles = (theme: ThemeName): { light: BootPageColors; dark: BootPageColors } => {
  if (theme === 'borealis') {
    return {
      light: {
        pageBackground: '#F6F9FC', // colors.body
        welcomeText: '#5A6D8C', // colors.subduedText
        progress: '#ECF1F9', // colors.lightestShade
        progressBefore: '#0B64DD', // colors.primary
        errorTitleText: '#07101F', // colors.textPrimary
        errorBodyText: '#5A6D8C', // colors.subduedText
        errorButtonBackground: '#0B64DD', // colors.primary
        errorButtonText: '#FFFFFF', // colors.textInverse
      },
      dark: {
        pageBackground: '#07101F',
        welcomeText: '#8E9FBC',
        progress: '#172336',
        progressBefore: '#599DFF',
        errorTitleText: '#EFF3F9', // colors.textPrimary
        errorBodyText: '#8E9FBC', // colors.subduedText
        errorButtonBackground: '#599DFF', // colors.primary
        errorButtonText: '#07101F', // colors.textInverse
      },
    };
  }

  return {
    light: {
      pageBackground: '#F8FAFD',
      welcomeText: '#69707D',
      progress: '#F5F7FA',
      progressBefore: '#006DE4',
      errorTitleText: '#1a1c21',
      errorBodyText: '#69707D',
      errorButtonBackground: '#006DE4',
      errorButtonText: '#FFFFFF',
    },
    dark: {
      pageBackground: '#141519',
      welcomeText: '#98A2B3',
      progress: '#25262E',
      progressBefore: '#1BA9F5',
      errorTitleText: '#DFE5EF',
      errorBodyText: '#98A2B3',
      errorButtonBackground: '#1BA9F5',
      errorButtonText: '#141519',
    },
  };
};

const bootstrapErrorLayoutRules = `
          .kbnBootstrapError {
            text-align: center;
            padding: 120px 20px;
            font-family: Inter, BlinkMacSystemFont, Helvetica, Arial, sans-serif;
          }

          .kbnBootstrapErrorTitle {
            margin: 20px;
            font-size: 1.75rem;
            font-weight: 700;
            line-height: 1.25;
          }

          .kbnBootstrapErrorText {
            margin: 20px;
            font-size: 1rem;
            line-height: 1.5;
          }

          .kbnBootstrapErrorButton {
            cursor: pointer;
            padding-inline: 12px;
            block-size: 40px;
            font-size: 1rem;
            line-height: 1.4286rem;
            border-radius: 6px;
            min-inline-size: 112px;
            border: none;
          }
`;

const bootPageRules = (colors: BootPageColors) => `
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

          .kbnBootstrapErrorTitle {
            color: ${colors.errorTitleText};
          }

          .kbnBootstrapErrorText {
            color: ${colors.errorBodyText};
          }

          .kbnBootstrapErrorButton {
            background-color: ${colors.errorButtonBackground};
            color: ${colors.errorButtonText};
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
      ? `${bootstrapErrorLayoutRules}${bootPageRules(light)}
          @media (prefers-color-scheme: dark) {
            ${bootPageRules(dark)}
          }`
      : `${bootstrapErrorLayoutRules}${bootPageRules(darkMode ? dark : light)}`;

  /* eslint-disable react/no-danger */
  return <style dangerouslySetInnerHTML={{ __html: css }} />;
  /* eslint-enable react/no-danger */
};
