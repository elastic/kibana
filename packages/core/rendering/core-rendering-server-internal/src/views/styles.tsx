/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { FC } from 'react';
import type { DarkModeValue } from '@kbn/core-ui-settings-common';
import { ThemeVersion } from '@kbn/ui-shared-deps-npm';

interface Props {
  darkMode: DarkModeValue;
  themeVersion: ThemeVersion;
  stylesheetPaths: string[];
}

export const Styles: FC<Props> = ({ darkMode, themeVersion, stylesheetPaths }) => {
  return (
    <>
      {darkMode !== 'system' && <InlineStyles darkMode={darkMode} themeVersion={themeVersion} />}
      {stylesheetPaths.map((path) => (
        <link key={path} rel="stylesheet" type="text/css" href={path} />
      ))}
    </>
  );
};

const InlineStyles: FC<{ darkMode: boolean; themeVersion: ThemeVersion }> = ({
  darkMode,
  themeVersion,
}) => {
  const themeStyles = {
    v8: {
      pageBackground: darkMode ? '#141519' : '#F8FAFD',
      welcomeText: darkMode ? '#98A2B3' : '#69707D',
      progress: darkMode ? '#25262E' : '#F5F7FA',
      progressBefore: darkMode ? '#1BA9F5' : '#006DE4',
    },
    borealis: {
      pageBackground: darkMode ? '#07101F' : '#F6F9FC',
      welcomeText: darkMode ? '#5A6D8C' : '#8E9FBC',
      progress: darkMode ? '#172336' : '#E3E8F2',
      progressBefore: darkMode ? '#599DFF' : '#0B64DD',
    },
    borealisgrey: {
      pageBackground: darkMode ? '#0E0F12' : '#F6F9FC',
      welcomeText: darkMode ? '#666D78' : '#989FAA',
      progress: darkMode ? '#23262C' : '#E3E6EB',
      progressBefore: darkMode ? '#599DFF' : '#0B64DD',
    },
  };
  // must be kept in sync with
  // packages/core/apps/core-apps-server-internal/assets/legacy_theme.js
  /* eslint-disable react/no-danger */
  return (
    <style
      dangerouslySetInnerHTML={{
        __html: `

          html {
            background-color: ${themeStyles[themeVersion].pageBackground}
          }

          .kbnWelcomeText {
            color: ${themeStyles[themeVersion].welcomeText};
          }

          .kbnProgress {
            background-color: ${themeStyles[themeVersion].progress};
          }

          .kbnProgress:before {
            background-color: ${themeStyles[themeVersion].progressBefore};
          }

        `,
      }}
    />
  );
  /* eslint-enable react/no-danger */
};
