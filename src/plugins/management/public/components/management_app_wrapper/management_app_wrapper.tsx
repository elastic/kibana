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

import React, { createRef, Component } from 'react';

import { ChromeBreadcrumb, AppMountParameters, ScopedHistory } from 'kibana/public';
import { ManagementApp } from '../../utils';
import { Unmount } from '../../types';

interface ManagementSectionWrapperProps {
  app: ManagementApp;
  setBreadcrumbs: (crumbs?: ChromeBreadcrumb[], history?: ScopedHistory) => void;
  onAppMounted: (id: string) => void;
  history: AppMountParameters['history'];
}

export class ManagementAppWrapper extends Component<ManagementSectionWrapperProps> {
  private unmount?: Unmount;
  private mountElementRef = createRef<HTMLElement>();

  componentDidMount() {
    const { setBreadcrumbs, app, onAppMounted, history } = this.props;
    const { mount, basePath } = app;
    const appHistory = history.createSubHistory(app.basePath);

    const mountResult = mount({
      basePath,
      setBreadcrumbs: (crumbs: ChromeBreadcrumb[]) => setBreadcrumbs(crumbs, appHistory),
      element: this.mountElementRef.current!,
      history: appHistory,
    });

    onAppMounted(app.id);

    if (mountResult instanceof Promise) {
      mountResult.then((um) => {
        this.unmount = um;
      });
    } else {
      this.unmount = mountResult;
    }
  }

  async componentWillUnmount() {
    if (this.unmount) {
      await this.unmount();
    }
  }

  render() {
    return <main ref={this.mountElementRef} />;
  }
}
