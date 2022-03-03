/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useEffect, useRef } from 'react';
import { Observable } from 'rxjs';
import ReactDOM from 'react-dom';
import { HashRouter as Router, Switch, Route, Redirect } from 'react-router-dom';
import { EuiTab, EuiTabs, EuiToolTip, EuiBetaBadge } from '@elastic/eui';
import { I18nProvider } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import { euiThemeVars } from '@kbn/ui-theme';

import type {
  ApplicationStart,
  ChromeStart,
  ScopedHistory,
  CoreTheme,
  ExecutionContextStart,
} from 'src/core/public';
import { KibanaThemeProvider, useExecutionContext } from '../../kibana_react/public';
import type { DocTitleService, BreadcrumbService } from './services';

import { DevToolApp } from './dev_tool';

export interface AppServices {
  docTitleService: DocTitleService;
  breadcrumbService: BreadcrumbService;
  executionContext: ExecutionContextStart;
}

interface DevToolsWrapperProps {
  devTools: readonly DevToolApp[];
  activeDevTool: DevToolApp;
  updateRoute: (newRoute: string) => void;
  theme$: Observable<CoreTheme>;
  appServices: AppServices;
}

interface MountedDevToolDescriptor {
  devTool: DevToolApp;
  mountpoint: HTMLElement;
  unmountHandler: () => void;
}

function DevToolsWrapper({
  devTools,
  activeDevTool,
  updateRoute,
  theme$,
  appServices,
}: DevToolsWrapperProps) {
  const { docTitleService, breadcrumbService } = appServices;
  const mountedTool = useRef<MountedDevToolDescriptor | null>(null);

  useEffect(
    () => () => {
      if (mountedTool.current) {
        mountedTool.current.unmountHandler();
      }
    },
    []
  );

  useEffect(() => {
    docTitleService.setTitle(activeDevTool.title);
    breadcrumbService.setBreadcrumbs(activeDevTool.title);
  }, [activeDevTool, docTitleService, breadcrumbService]);

  useExecutionContext(appServices.executionContext, {
    type: 'application',
    page: activeDevTool.id,
  });

  return (
    <main className="devApp">
      <EuiTabs style={{ paddingLeft: euiThemeVars.euiSizeS }} size="l">
        {devTools.map((currentDevTool) => (
          <EuiTab
            key={currentDevTool.id}
            disabled={currentDevTool.isDisabled()}
            isSelected={currentDevTool === activeDevTool}
            onClick={() => {
              if (!currentDevTool.isDisabled()) {
                updateRoute(`/${currentDevTool.id}`);
              }
            }}
          >
            <EuiToolTip content={currentDevTool.tooltipContent}>
              <span>
                {currentDevTool.title}{' '}
                {currentDevTool.isBeta && (
                  <EuiBetaBadge
                    size="s"
                    className="devApp__tabBeta"
                    label={i18n.translate('devTools.badge.betaLabel', {
                      defaultMessage: 'Beta',
                    })}
                    tooltipContent={i18n.translate('devTools.badge.betaTooltipText', {
                      defaultMessage: 'This feature might change drastically in future releases',
                    })}
                  />
                )}
              </span>
            </EuiToolTip>
          </EuiTab>
        ))}
      </EuiTabs>
      <div
        className="devApp__container"
        role="tabpanel"
        data-test-subj={activeDevTool.id}
        ref={async (element) => {
          if (
            element &&
            (mountedTool.current === null ||
              mountedTool.current.devTool !== activeDevTool ||
              mountedTool.current.mountpoint !== element)
          ) {
            if (mountedTool.current) {
              mountedTool.current.unmountHandler();
            }

            const params = {
              element,
              appBasePath: '',
              onAppLeave: () => undefined,
              setHeaderActionMenu: () => undefined,
              // TODO: adapt to use Core's ScopedHistory
              history: {} as any,
              theme$,
            };

            const unmountHandler = await activeDevTool.mount(params);

            mountedTool.current = {
              devTool: activeDevTool,
              mountpoint: element,
              unmountHandler,
            };
          }
        }}
      />
    </main>
  );
}

function redirectOnMissingCapabilities(application: ApplicationStart) {
  if (!application.capabilities.dev_tools.show) {
    application.navigateToApp('home');
    return true;
  }
  return false;
}

function setBadge(application: ApplicationStart, chrome: ChromeStart) {
  if (application.capabilities.dev_tools.save) {
    return;
  }

  chrome.setBadge({
    text: i18n.translate('devTools.badge.readOnly.text', {
      defaultMessage: 'Read only',
    }),
    tooltip: i18n.translate('devTools.badge.readOnly.tooltip', {
      defaultMessage: 'Unable to save',
    }),
    iconType: 'glasses',
  });
}

export function renderApp(
  element: HTMLElement,
  application: ApplicationStart,
  chrome: ChromeStart,
  history: ScopedHistory,
  theme$: Observable<CoreTheme>,
  devTools: readonly DevToolApp[],
  appServices: AppServices
) {
  if (redirectOnMissingCapabilities(application)) {
    return () => {};
  }

  setBadge(application, chrome);

  ReactDOM.render(
    <I18nProvider>
      <KibanaThemeProvider theme$={theme$}>
        <Router>
          <Switch>
            {devTools
              // Only create routes for devtools that are not disabled
              .filter((devTool) => !devTool.isDisabled())
              .map((devTool) => (
                <Route
                  key={devTool.id}
                  path={`/${devTool.id}`}
                  exact={!devTool.enableRouting}
                  render={(props) => (
                    <DevToolsWrapper
                      updateRoute={props.history.push}
                      activeDevTool={devTool}
                      devTools={devTools}
                      theme$={theme$}
                      appServices={appServices}
                    />
                  )}
                />
              ))}
            <Route path="/">
              <Redirect to={`/${devTools[0].id}`} />
            </Route>
          </Switch>
        </Router>
      </KibanaThemeProvider>
    </I18nProvider>,
    element
  );

  // dispatch synthetic hash change event to update hash history objects
  // this is necessary because hash updates triggered by using popState won't trigger this event naturally.
  const unlisten = history.listen(() => {
    window.dispatchEvent(new HashChangeEvent('hashchange'));
  });

  return () => {
    chrome.docTitle.reset();
    ReactDOM.unmountComponentAtNode(element);
    unlisten();
  };
}
