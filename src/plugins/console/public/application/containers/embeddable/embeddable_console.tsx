/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useReducer, useEffect } from 'react';
import classNames from 'classnames';
import useObservable from 'react-use/lib/useObservable';
import {
  EuiButton,
  EuiFocusTrap,
  EuiPortal,
  EuiScreenReaderOnly,
  EuiThemeProvider,
  keys,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { dynamic } from '@kbn/shared-ux-utility';

import {
  EmbeddableConsoleProps,
  EmbeddableConsoleDependencies,
} from '../../../types/embeddable_console';

import * as store from '../../stores/embeddable_console';
import { setLoadFromParameter, removeLoadFromParameter } from '../../lib/load_from';

import './_index.scss';

const KBN_BODY_CONSOLE_CLASS = 'kbnBody--hasEmbeddableConsole';

const landmarkHeading = i18n.translate('console.embeddableConsole.landmarkHeading', {
  defaultMessage: 'Developer console',
});

const ConsoleWrapper = dynamic(async () => ({
  default: (await import('./console_wrapper')).ConsoleWrapper,
}));

export const EmbeddableConsole = ({
  size = 'm',
  core,
  usageCollection,
  setDispatch,
}: EmbeddableConsoleProps & EmbeddableConsoleDependencies) => {
  const [consoleState, consoleDispatch] = useReducer(
    store.reducer,
    store.initialValue,
    (value) => ({ ...value })
  );
  const chromeStyle = useObservable(core.chrome.getChromeStyle$());
  useEffect(() => {
    setDispatch(consoleDispatch);
    return () => setDispatch(null);
  }, [setDispatch, consoleDispatch]);
  useEffect(() => {
    if (consoleState.isOpen && consoleState.loadFromContent) {
      setLoadFromParameter(consoleState.loadFromContent);
    } else if (!consoleState.isOpen) {
      removeLoadFromParameter();
    }
  }, [consoleState.isOpen, consoleState.loadFromContent]);
  useEffect(() => {
    document.body.classList.add(KBN_BODY_CONSOLE_CLASS);
    return () => document.body.classList.remove(KBN_BODY_CONSOLE_CLASS);
  }, []);

  const isConsoleOpen = consoleState.isOpen;
  const setIsConsoleOpen = (value: boolean) => {
    consoleDispatch(value ? { type: 'open' } : { type: 'close' });
  };
  const toggleConsole = () => setIsConsoleOpen(!isConsoleOpen);

  const onKeyDown = (event: any) => {
    if (event.key === keys.ESCAPE) {
      event.preventDefault();
      event.stopPropagation();
      setIsConsoleOpen(false);
    }
  };

  const classes = classNames('embeddableConsole', {
    'embeddableConsole-isOpen': isConsoleOpen,
    'embeddableConsole--large': size === 'l',
    'embeddableConsole--medium': size === 'm',
    'embeddableConsole--small': size === 's',
    'embeddableConsole--classicChrome': chromeStyle === 'classic',
    'embeddableConsole--projectChrome': chromeStyle === 'project',
    'embeddableConsole--unknownChrome': chromeStyle === undefined,
    'embeddableConsole--fixed': true,
    'embeddableConsole--showOnMobile': false,
  });

  return (
    <EuiPortal>
      <EuiFocusTrap onClickOutside={toggleConsole} disabled={!isConsoleOpen}>
        <section
          aria-label={landmarkHeading}
          className={classes}
          data-test-subj="consoleEmbeddedSection"
        >
          <EuiScreenReaderOnly>
            <h2>{landmarkHeading}</h2>
          </EuiScreenReaderOnly>
          <EuiThemeProvider colorMode={'dark'} wrapperProps={{ cloneElement: true }}>
            <div className="embeddableConsole__controls">
              <EuiButton
                color="text"
                iconType={isConsoleOpen ? 'arrowUp' : 'arrowDown'}
                onClick={toggleConsole}
                fullWidth
                contentProps={{
                  className: 'embeddableConsole__controls--button',
                }}
                data-test-subj="consoleEmbeddedControlBar"
                data-telemetry-id="console-embedded-controlbar-button"
              >
                {i18n.translate('console.embeddableConsole.title', {
                  defaultMessage: 'Console',
                })}
              </EuiButton>
            </div>
          </EuiThemeProvider>
          {isConsoleOpen ? <ConsoleWrapper {...{ core, usageCollection, onKeyDown }} /> : null}
        </section>
        <EuiScreenReaderOnly>
          <p aria-live="assertive">
            {i18n.translate('console.embeddableConsole.customScreenReaderAnnouncement', {
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
