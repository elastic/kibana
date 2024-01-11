/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useState } from 'react';
import classNames from 'classnames';
import {
  EuiFocusTrap,
  EuiPortal,
  EuiScreenReaderOnly,
  EuiThemeProvider,
  EuiWindowEvent,
  keys,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { RemoteConsoleProps, RemoteConsoleDependencies } from '../../../types/remote_console';

import { ConsoleHeader } from './console_header';
import { ConsoleWrapper } from './console_wrapper';

import './_index.scss';

const landmarkHeading = i18n.translate('console.remoteConsole.landmarkHeading', {
  defaultMessage: 'Developer console',
});

export const RemoteConsole = ({
  headerRightSideItem,
  size = 'm',
  core,
  usageCollection,
}: RemoteConsoleProps & RemoteConsoleDependencies) => {
  const [isConsoleOpen, setIsConsoleOpen] = useState<boolean>(false);
  const toggleConsole = () => setIsConsoleOpen(!isConsoleOpen);

  const onKeyDown = (event: any) => {
    if (event.key === keys.ESCAPE) {
      event.preventDefault();
      event.stopPropagation();
      setIsConsoleOpen(false);
    }
  };

  const classes = classNames('remoteConsole', {
    'remoteConsole-isOpen': isConsoleOpen,
    'remoteConsole--large': size === 'l',
    'remoteConsole--medium': size === 'm',
    'remoteConsole--small': size === 's',
    'remoteConsole--fixed': true,
    'remoteConsole--showOnMobile': false,
  });

  return (
    <EuiPortal>
      <EuiFocusTrap onClickOutside={toggleConsole} disabled={!isConsoleOpen}>
        <section aria-label={landmarkHeading} className={classes}>
          <EuiScreenReaderOnly>
            <h2>{landmarkHeading}</h2>
          </EuiScreenReaderOnly>
          <EuiThemeProvider colorMode={'dark'} wrapperProps={{ cloneElement: true }}>
            <div className="remoteConsole__controls">
              <ConsoleHeader
                isConsoleOpen={isConsoleOpen}
                rightSideItem={headerRightSideItem}
                onClick={toggleConsole}
              />
            </div>
          </EuiThemeProvider>
          {isConsoleOpen ? (
            <div className="remoteConsole__content">
              <EuiWindowEvent event="keydown" handler={onKeyDown} />
              <ConsoleWrapper core={core} usageCollection={usageCollection} />
            </div>
          ) : null}
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
      </EuiFocusTrap>
    </EuiPortal>
  );
};

// Default Export is needed to lazy load this react component
// eslint-disable-next-line import/no-default-export
export default RemoteConsole;
