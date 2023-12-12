/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { FC } from 'react';

interface Props {
  darkMode: boolean;
  stylesheetPaths: string[];
}

export const Styles: FC<Props> = ({ darkMode, stylesheetPaths }) => {
  return (
    <>
      <InlineStyles darkMode={darkMode} />
      {stylesheetPaths.map((path) => (
        <link key={path} rel="stylesheet" type="text/css" href={path} />
      ))}
    </>
  );
};

const InlineStyles: FC<{ darkMode: boolean }> = ({ darkMode }) => {
  /* eslint-disable react/no-danger */
  return (
    <style
      dangerouslySetInnerHTML={{
        __html: `

          html {
            background-color: ${darkMode ? '#141519' : '#F8FAFD'}
          }

          .kbnWelcomeText {
            color: ${darkMode ? '#98A2B3' : '#69707D'};
          }

          .kbnProgress {
            background-color: ${darkMode ? '#25262E' : '#F5F7FA'};
          }

          .kbnProgress:before {
            background-color: ${darkMode ? '#1BA9F5' : '#006DE4'};
          }

        `,
      }}
    />
  );
  /* eslint-enable react/no-danger */
};
