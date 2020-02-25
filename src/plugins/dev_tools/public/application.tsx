/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { I18nProvider } from '@kbn/i18n/react';
import { i18n } from '@kbn/i18n';
import { EuiTab, EuiTabs, EuiToolTip } from '@elastic/eui';
import { HashRouter as Router, Switch, Route, Redirect } from 'react-router-dom';
import * as React from 'react';
import ReactDOM from 'react-dom';
import { useEffect, useRef } from 'react';

import { AppMountContext, AppMountDeprecated } from 'kibana/public';
import { DevTool } from './plugin';

interface DevToolsWrapperProps {
  devTools: readonly DevTool[];
  activeDevTool: DevTool;
  appMountContext: AppMountContext;
  updateRoute: (newRoute: string) => void;
}

interface MountedDevToolDescriptor {
  devTool: DevTool;
  mountpoint: HTMLElement;
  unmountHandler: () => void;
}

function DevToolsWrapper({
  devTools,
  activeDevTool,
  appMountContext,
  updateRoute,
}: DevToolsWrapperProps) {
  const mountedTool = useRef<MountedDevToolDescriptor | null>(null);

  useEffect(
    () => () => {
      if (mountedTool.current) {
        mountedTool.current.unmountHandler();
      }
    },
    []
  );

  return (
    <main className="devApp">
      <EuiTabs>
        {devTools.map(currentDevTool => (
          <EuiToolTip content={currentDevTool.tooltipContent} key={currentDevTool.id}>
            <EuiTab
              disabled={currentDevTool.disabled}
              isSelected={currentDevTool === activeDevTool}
              onClick={() => {
                if (!currentDevTool.disabled) {
                  updateRoute(`/dev_tools/${currentDevTool.id}`);
                }
              }}
            >
              {currentDevTool.title}
            </EuiTab>
          </EuiToolTip>
        ))}
      </EuiTabs>
      <div
        className="devApp__container"
        role="tabpanel"
        data-test-subj={activeDevTool.id}
        ref={async element => {
          if (
            element &&
            (mountedTool.current === null ||
              mountedTool.current.devTool !== activeDevTool ||
              mountedTool.current.mountpoint !== element)
          ) {
            if (mountedTool.current) {
              mountedTool.current.unmountHandler();
            }
            const params = { element, appBasePath: '', onAppLeave: () => undefined };
            const unmountHandler = isAppMountDeprecated(activeDevTool.mount)
              ? await activeDevTool.mount(appMountContext, params)
              : await activeDevTool.mount(params);
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

function redirectOnMissingCapabilities(appMountContext: AppMountContext) {
  if (!appMountContext.core.application.capabilities.dev_tools.show) {
    window.location.hash = '/home';
    return true;
  }
  return false;
}

function setBadge(appMountContext: AppMountContext) {
  if (appMountContext.core.application.capabilities.dev_tools.save) {
    return;
  }
  appMountContext.core.chrome.setBadge({
    text: i18n.translate('devTools.badge.readOnly.text', {
      defaultMessage: 'Read only',
    }),
    tooltip: i18n.translate('devTools.badge.readOnly.tooltip', {
      defaultMessage: 'Unable to save',
    }),
    iconType: 'glasses',
  });
}

function setBreadcrumbs(appMountContext: AppMountContext) {
  appMountContext.core.chrome.setBreadcrumbs([
    {
      text: i18n.translate('devTools.k7BreadcrumbsDevToolsLabel', {
        defaultMessage: 'Dev Tools',
      }),
      href: '#/dev_tools',
    },
  ]);
}

export function renderApp(
  element: HTMLElement,
  appMountContext: AppMountContext,
  basePath: string,
  devTools: readonly DevTool[]
) {
  if (redirectOnMissingCapabilities(appMountContext)) {
    return () => {};
  }
  setBadge(appMountContext);
  setBreadcrumbs(appMountContext);
  ReactDOM.render(
    <I18nProvider>
      <Router>
        <Switch>
          {devTools.map(devTool => (
            <Route
              key={devTool.id}
              path={`/dev_tools/${devTool.id}`}
              exact={!devTool.enableRouting}
              render={props => (
                <DevToolsWrapper
                  updateRoute={props.history.push}
                  activeDevTool={devTool}
                  devTools={devTools}
                  appMountContext={appMountContext}
                />
              )}
            />
          ))}
          <Route path="/dev_tools">
            <Redirect to={`/dev_tools/${devTools[0].id}`} />
          </Route>
        </Switch>
      </Router>
    </I18nProvider>,
    element
  );

  return () => ReactDOM.unmountComponentAtNode(element);
}

function isAppMountDeprecated(mount: (...args: any[]) => any): mount is AppMountDeprecated {
  // Mount functions with two arguments are assumed to expect deprecated `context` object.
  return mount.length === 2;
}
