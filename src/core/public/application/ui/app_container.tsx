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

import React from 'react';
import { RouteComponentProps } from 'react-router-dom';
import { Subject } from 'rxjs';

import { LegacyApp, AppMount, AppUnmount } from '../types';
import { HttpStart } from '../../http';
import { AppNotFound } from './app_not_found_screen';

interface Props extends RouteComponentProps<{ appId: string }> {
  apps: ReadonlyMap<string, AppMount>;
  legacyApps: ReadonlyMap<string, LegacyApp>;
  basePath: HttpStart['basePath'];
  currentAppId$: Subject<string | undefined>;
  /**
   * Only necessary for redirecting to legacy apps
   * @deprecated
   */
  redirectTo: (path: string) => void;
}

interface State {
  appNotFound: boolean;
}

export class AppContainer extends React.Component<Props, State> {
  private readonly containerDiv = React.createRef<HTMLDivElement>();
  private unmountFunc?: AppUnmount;

  state: State = { appNotFound: false };

  componentDidMount() {
    this.mountApp();
  }

  componentWillUnmount() {
    this.unmountApp();
  }

  componentDidUpdate(prevProps: Props) {
    if (prevProps.match.params.appId !== this.props.match.params.appId) {
      this.unmountApp();
      this.mountApp();
    }
  }

  async mountApp() {
    const { apps, legacyApps, match, basePath, currentAppId$, redirectTo } = this.props;
    const { appId } = match.params;

    const mount = apps.get(appId);
    if (mount) {
      this.unmountFunc = await mount({
        appBasePath: basePath.prepend(`/app/${appId}`),
        element: this.containerDiv.current!,
      });
      currentAppId$.next(appId);
      this.setState({ appNotFound: false });
      return;
    }

    const legacyApp = findLegacyApp(appId, legacyApps);
    if (legacyApp) {
      this.unmountApp();
      redirectTo(basePath.prepend(`/app/${appId}`));
      this.setState({ appNotFound: false });
      return;
    }

    this.setState({ appNotFound: true });
  }

  async unmountApp() {
    if (this.unmountFunc) {
      this.unmountFunc();
      this.unmountFunc = undefined;
    }
  }

  render() {
    return (
      <React.Fragment>
        {this.state.appNotFound && <AppNotFound />}
        <div key={this.props.match.params.appId} ref={this.containerDiv} />
      </React.Fragment>
    );
  }
}

function findLegacyApp(appId: string, apps: ReadonlyMap<string, LegacyApp>) {
  const matchingApps = [...apps.entries()].filter(([id]) => id.split(':')[0] === appId);
  return matchingApps.length ? matchingApps[0][1] : null;
}
