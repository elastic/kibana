/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useReducer, useEffect, useState } from 'react';
import classNames from 'classnames';
import useObservable from 'react-use/lib/useObservable';
import {
  EuiButtonEmpty,
  EuiFocusTrap,
  EuiPortal,
  EuiScreenReaderOnly,
  EuiThemeComputed,
  EuiThemeProvider,
  EuiWindowEvent,
  keys,
  useEuiTheme,
  useEuiThemeCSSVariables,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { dynamic } from '@kbn/shared-ux-utility';

import {
  EmbeddableConsoleDependencies,
  EmbeddableConsoleView,
} from '../../../types/embeddable_console';

import * as store from '../../stores/embeddable_console';
import { setLoadFromParameter, removeLoadFromParameter } from '../../lib/load_from';

import './_index.scss';
import { EmbeddedConsoleResizeButton, getCurrentConsoleMaxSize } from './console_resize_button';

const KBN_BODY_CONSOLE_CLASS = 'kbnBody--hasEmbeddableConsole';
const CONSOLE_HEIGHT_STORAGE_KEY = 'sense:embeddedConsoleHeight';

const landmarkHeading = i18n.translate('console.embeddableConsole.landmarkHeading', {
  defaultMessage: 'Developer console',
});

const ConsoleWrapper = dynamic(async () => ({
  default: (await import('./console_wrapper')).ConsoleWrapper,
}));

const getInitialConsoleHeight = (euiTheme: EuiThemeComputed) => {
  const localStorageHeight = localStorage.getItem(CONSOLE_HEIGHT_STORAGE_KEY);
  if (localStorageHeight) {
    try {
      return parseInt(localStorageHeight, 10);
    } catch {
      // ignore bad local storage value
    }
  }
  return getCurrentConsoleMaxSize(euiTheme);
};

export const EmbeddableConsole = ({
  core,
  usageCollection,
  setDispatch,
  alternateView,
  isMonacoEnabled,
}: EmbeddableConsoleDependencies) => {
  const { euiTheme } = useEuiTheme();
  const { setGlobalCSSVariables } = useEuiThemeCSSVariables();
  const [consoleHeight, setConsoleHeight] = useState<number>(getInitialConsoleHeight(euiTheme));

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
    if (consoleState.view === EmbeddableConsoleView.Console && consoleState.loadFromContent) {
      setLoadFromParameter(consoleState.loadFromContent);
    } else if (consoleState.view === EmbeddableConsoleView.Closed) {
      removeLoadFromParameter();
    }
  }, [consoleState.view, consoleState.loadFromContent]);
  useEffect(() => {
    document.body.classList.add(KBN_BODY_CONSOLE_CLASS);
    return () => document.body.classList.remove(KBN_BODY_CONSOLE_CLASS);
  }, []);
  useEffect(() => {
    setGlobalCSSVariables({
      '--embedded-console-height': `${consoleHeight}px`,
      '--embedded-console-bottom': `-${consoleHeight}px`,
    });
    localStorage.setItem(CONSOLE_HEIGHT_STORAGE_KEY, consoleHeight.toString());
  }, [consoleHeight, setGlobalCSSVariables]);

  const isOpen = consoleState.view !== EmbeddableConsoleView.Closed;
  const showConsole =
    consoleState.view !== EmbeddableConsoleView.Closed &&
    (consoleState.view === EmbeddableConsoleView.Console || alternateView === undefined);
  const showAlternateView =
    consoleState.view === EmbeddableConsoleView.Alternate && alternateView !== undefined;
  const setIsConsoleOpen = (value: boolean) => {
    consoleDispatch(value ? { type: 'open' } : { type: 'close' });
  };
  const toggleConsole = () => setIsConsoleOpen(!isOpen);
  const clickAlternateViewActivateButton: React.MouseEventHandler<HTMLButtonElement> = (e) => {
    e.preventDefault();
    switch (consoleState.view) {
      case EmbeddableConsoleView.Console:
      case EmbeddableConsoleView.Closed:
        consoleDispatch({ type: 'open', payload: { alternateView: true } });
        break;
      case EmbeddableConsoleView.Alternate:
        consoleDispatch({ type: 'open', payload: { alternateView: false } });
        break;
    }
  };

  const onKeyDown = (event: any) => {
    if (event.key === keys.ESCAPE) {
      event.preventDefault();
      event.stopPropagation();
      setIsConsoleOpen(false);
    }
  };

  const classes = classNames('embeddableConsole', {
    'embeddableConsole-isOpen': isOpen,
    'embeddableConsole--classicChrome': chromeStyle === 'classic',
    'embeddableConsole--projectChrome': chromeStyle === 'project',
    'embeddableConsole--unknownChrome': chromeStyle === undefined,
    'embeddableConsole--fixed': true,
  });

  return (
    <EuiPortal>
      <EuiFocusTrap onClickOutside={toggleConsole} disabled={!isOpen}>
        <section
          aria-label={landmarkHeading}
          className={classes}
          data-test-subj="consoleEmbeddedSection"
        >
          <EuiScreenReaderOnly>
            <h2>{landmarkHeading}</h2>
          </EuiScreenReaderOnly>
          <EuiThemeProvider colorMode={'dark'} wrapperProps={{ cloneElement: true }}>
            <div>
              {isOpen && (
                <EmbeddedConsoleResizeButton
                  consoleHeight={consoleHeight}
                  setConsoleHeight={setConsoleHeight}
                />
              )}

              <div className="embeddableConsole__controls">
                <EuiButtonEmpty
                  color="text"
                  iconType={isOpen ? 'arrowUp' : 'arrowDown'}
                  onClick={toggleConsole}
                  className="embeddableConsole__controls--button"
                  data-test-subj="consoleEmbeddedControlBar"
                  data-telemetry-id="console-embedded-controlbar-button"
                >
                  {i18n.translate('console.embeddableConsole.title', {
                    defaultMessage: 'Console',
                  })}
                </EuiButtonEmpty>
                {alternateView && (
                  <div className="embeddableConsole__controls--altViewButton-container">
                    <alternateView.ActivationButton
                      activeView={showAlternateView}
                      onClick={clickAlternateViewActivateButton}
                    />
                  </div>
                )}
              </div>
            </div>
          </EuiThemeProvider>
          {showConsole ? (
            <ConsoleWrapper {...{ core, usageCollection, onKeyDown, isMonacoEnabled }} />
          ) : null}
          {showAlternateView ? (
            <div className="embeddableConsole__content" data-test-subj="consoleEmbeddedBody">
              <EuiWindowEvent event="keydown" handler={onKeyDown} />
              <alternateView.ViewContent />
            </div>
          ) : null}
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
