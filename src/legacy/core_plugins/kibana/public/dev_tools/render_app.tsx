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
import { EuiTab, EuiTabs } from '@elastic/eui';
import { HashRouter as Router, Switch, Route, Redirect } from 'react-router-dom';
import * as React from 'react';
import ReactDOM from 'react-dom';
import { useEffect, useRef } from 'react';

import { AppMountContext } from 'kibana/public';

import { DevTool } from './plugin';

interface DevToolsWrapperProps {
  devTools: DevTool[];
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
          // TODO tooltips
          <EuiTab
            key={currentDevTool.id}
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
        ))}
      </EuiTabs>
      <div
        className="devApp__container"
        role="tabpanel"
        key={activeDevTool.id}
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
            const unmountHandler = await activeDevTool.mount(appMountContext, {
              element,
              appBasePath: '',
            });
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

export function renderApp(
  element: HTMLElement,
  appMountContext: AppMountContext,
  basePath: string,
  devTools: DevTool[]
) {
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
