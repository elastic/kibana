/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useState } from 'react';
import {
  EuiPageTemplate,
  EuiPanel,
  EuiScreenReaderOnly,
  EuiThemeProvider,
  useEuiTheme,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { RemoteConsoleProps, RemoteConsoleDependencies } from '../../../types/remote_console';

import { ConsoleHeader } from './console_header';
import { ConsoleWrapper } from './console_wrapper';
import { remoteConsoleStyles } from './remote_console.styles';

const landmarkHeading = i18n.translate('console.remoteConsole.landmarkHeading', {
  defaultMessage: 'Developer console',
});

export const RemoteConsole = ({
  headerRightSideItem,
  core,
  usageCollection,
}: RemoteConsoleProps & RemoteConsoleDependencies) => {
  const euiTheme = useEuiTheme();
  const [isConsoleOpen, setIsConsoleOpen] = useState<boolean>(false);
  const toggleConsole = () => setIsConsoleOpen(!isConsoleOpen);
  const consoleStyles = remoteConsoleStyles(euiTheme);

  return (
    <>
      <section aria-label={landmarkHeading} css={consoleStyles.container}>
        <EuiScreenReaderOnly>
          <h2>{landmarkHeading}</h2>
        </EuiScreenReaderOnly>
        <EuiThemeProvider colorMode={'dark'} wrapperProps={{ cloneElement: true }}>
          <EuiPanel borderRadius="none" hasShadow={false} onClick={toggleConsole}>
            <ConsoleHeader isConsoleOpen={isConsoleOpen} rightSideItem={headerRightSideItem} />
          </EuiPanel>
        </EuiThemeProvider>
        {isConsoleOpen && (
          <EuiPageTemplate offset={0} grow>
            <ConsoleWrapper core={core} usageCollection={usageCollection} />
          </EuiPageTemplate>
        )}
      </section>
      <EuiScreenReaderOnly>
        <p aria-live="assertive">
          {i18n.translate('console.remoteConsole.customScreenReaderAnnouncement', {
            defaultMessage:
              'There is a new region landmark called {landmarkHeading} with page level controls at the end of the document.',
            values: { landmarkHeading },
          })}
        </p>
      </EuiScreenReaderOnly>
    </>
  );
};

// Default Export is needed to lazy load this react component
// eslint-disable-next-line import/no-default-export
export default RemoteConsole;
