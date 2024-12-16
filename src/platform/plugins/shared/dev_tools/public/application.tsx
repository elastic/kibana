/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
import { Redirect, RouteComponentProps } from 'react-router-dom';
import { HashRouter as Router, Routes, Route } from '@kbn/shared-ux-router';
import { EuiTab, EuiTabs, EuiToolTip, EuiBetaBadge } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { euiThemeVars } from '@kbn/ui-theme';

import type {
  ApplicationStart,
  ChromeStart,
  ScopedHistory,
  ExecutionContextStart,
} from '@kbn/core/public';
import { KibanaRenderContextProvider } from '@kbn/react-kibana-context-render';
import type { DocTitleService, BreadcrumbService } from './services';

import { DevToolApp } from './dev_tool';
import { DevToolsStartServices } from './types';

export interface AppServices {
  docTitleService: DocTitleService;
  breadcrumbService: BreadcrumbService;
  executionContext: ExecutionContextStart;
}

interface DevToolsWrapperProps {
  devTools: readonly DevToolApp[];
  activeDevTool: DevToolApp;
  history: RouteComponentProps['history'];
  appServices: AppServices;
  location: RouteComponentProps['location'];
  startServices: DevToolsStartServices;
}

interface MountedDevToolDescriptor {
  devTool: DevToolApp;
  mountpoint: HTMLElement;
  unmountHandler: () => void;
}

function DevToolsWrapper({
  devTools,
  activeDevTool,
  history,
  appServices,
  location,
  startServices,
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

  return (
    <main className="devApp">
      <EuiTabs css={{ paddingLeft: euiThemeVars.euiSizeS }} size="l">
        {devTools.map((currentDevTool) => (
          <EuiTab
            key={currentDevTool.id}
            disabled={currentDevTool.isDisabled()}
            isSelected={currentDevTool === activeDevTool}
            onClick={() => {
              if (!currentDevTool.isDisabled()) {
                history.push(`/${currentDevTool.id}`);
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
              location,
              history,
              ...startServices,
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
  devTools: readonly DevToolApp[],
  appServices: AppServices,
  startServices: DevToolsStartServices
) {
  if (redirectOnMissingCapabilities(application)) {
    return () => {};
  }

  setBadge(application, chrome);

  ReactDOM.render(
    <KibanaRenderContextProvider {...startServices}>
      <Router>
        <Routes>
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
                    history={props.history}
                    location={props.location}
                    activeDevTool={devTool}
                    devTools={devTools}
                    appServices={appServices}
                    startServices={startServices}
                  />
                )}
              />
            ))}
          <Route path="/">
            <Redirect to={`/${devTools[0].id}`} />
          </Route>
        </Routes>
      </Router>
    </KibanaRenderContextProvider>,
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
