/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useReducer, useEffect, useState } from 'react';
import useObservable from 'react-use/lib/useObservable';
import type { EuiThemeComputed } from '@elastic/eui';
import {
  EuiButtonEmpty,
  EuiFocusTrap,
  EuiPortal,
  EuiScreenReaderOnly,
  EuiThemeProvider,
  EuiWindowEvent,
  keys,
  useEuiTheme,
  useEuiThemeCSSVariables,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { dynamic } from '@kbn/shared-ux-utility';

import { Global } from '@emotion/react';
import type { EmbeddableConsoleDependencies } from '../../../types/embeddable_console';
import { EmbeddableConsoleView } from '../../../types/embeddable_console';

import * as store from '../../stores/embeddable_console';
import { setLoadFromParameter, removeLoadFromParameter } from '../../lib/load_from';
import { useStyles } from './embeddable_console.styles';

import { EmbeddedConsoleResizeButton, getCurrentConsoleMaxSize } from './console_resize_button';

const KBN_BODY_CONSOLE_CLASS = 'kbnBody--hasEmbeddableConsole';

const landmarkHeading = i18n.translate('console.embeddableConsole.landmarkHeading', {
  defaultMessage:
    "Developer console. Press Enter to start editing. When you're done, press Escape to stop editing.",
});

const ConsoleWrapper = dynamic(async () => ({
  default: (await import('./console_wrapper')).ConsoleWrapper,
}));

const getInitialConsoleHeight = (
  getConsoleHeight: EmbeddableConsoleDependencies['getConsoleHeight'],
  euiTheme: EuiThemeComputed
) => {
  const lastHeight = getConsoleHeight();
  if (lastHeight) {
    try {
      const value = parseInt(lastHeight, 10);
      if (!isNaN(value) && value > 0) {
        return value;
      }
    } catch {
      // ignore bad local storage value
    }
  }
  return getCurrentConsoleMaxSize(euiTheme);
};

export const EmbeddableConsole = ({
  core,
  dataViews,
  data,
  licensing,
  usageCollection,
  setDispatch,
  alternateView,
  isDevMode,
  getConsoleHeight,
  setConsoleHeight,
}: EmbeddableConsoleDependencies) => {
  const { euiTheme } = useEuiTheme();
  const { setGlobalCSSVariables } = useEuiThemeCSSVariables();
  const chromeStyle = useObservable(core.chrome.getChromeStyle$());
  const [consoleHeight, setConsoleHeightState] = useState<number>(
    getInitialConsoleHeight(getConsoleHeight, euiTheme)
  );

  const [consoleState, consoleDispatch] = useReducer(
    store.reducer,
    store.initialValue,
    (value) => ({ ...value })
  );
  const isOpen = consoleState.view !== EmbeddableConsoleView.Closed;
  const styles = useStyles();

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
    setConsoleHeight(consoleHeight.toString());
  }, [consoleHeight, setGlobalCSSVariables, setConsoleHeight]);

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

  return (
    <>
      <Global styles={styles.embeddableConsoleGlobal} />
      <EuiPortal>
        <EuiFocusTrap onClickOutside={toggleConsole} disabled={!isOpen}>
          <section
            aria-label={landmarkHeading}
            css={[
              styles.embeddableConsole,
              isOpen && styles.embeddableConsoleOpen,
              chromeStyle === 'classic' && styles.embeddableConsoleChromeClassic,
              chromeStyle === 'project' && styles.embeddableConsoleChromeProject,
              chromeStyle === undefined && styles.embeddableConsoleChromeDefault,
              styles.embeddableConsoleFixed,
            ]}
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
                    setConsoleHeight={setConsoleHeightState}
                  />
                )}

                <div css={styles.embeddableConsoleControls}>
                  <EuiButtonEmpty
                    color="text"
                    iconType={isOpen ? 'arrowUp' : 'arrowDown'}
                    onClick={toggleConsole}
                    css={styles.embeddableConsoleControlsButton}
                    data-test-subj="consoleEmbeddedControlBar"
                    data-telemetry-id="console-embedded-controlbar-button"
                    aria-label={i18n.translate('console.embeddableConsole.toggleButtonAriaLabel', {
                      defaultMessage: 'Toggle console',
                    })}
                  >
                    {i18n.translate('console.embeddableConsole.title', {
                      defaultMessage: 'Console',
                    })}
                  </EuiButtonEmpty>
                  {alternateView && (
                    <div css={styles.embeddableControlsAltViewButtonContainer}>
                      <alternateView.ActivationButton
                        activeView={showAlternateView}
                        onClick={clickAlternateViewActivateButton}
                      />
                    </div>
                  )}
                </div>
              </div>
            </EuiThemeProvider>
            {consoleState.consoleHasBeenOpened ? (
              <ConsoleWrapper
                isOpen={showConsole}
                core={core}
                dataViews={dataViews}
                data={data}
                licensing={licensing}
                usageCollection={usageCollection}
                onKeyDown={onKeyDown}
                isDevMode={isDevMode}
              />
            ) : null}
            {showAlternateView ? (
              <div css={styles.embeddableConsoleContent} data-test-subj="consoleEmbeddedBody">
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
    </>
  );
};
