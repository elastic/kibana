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

import * as Rx from 'rxjs';
import { catchError, takeUntil } from 'rxjs/operators';
import ReactDOM from 'react-dom';
import React from 'react';
import { I18nProvider } from '@kbn/i18n/react';
import { PluginInitializerContext, CoreSetup, CoreStart, Plugin } from 'src/core/public';
import { NewsfeedPluginInjectedConfig } from '../types';
import { NewsfeedNavButton, NewsfeedApiFetchResult } from './components/newsfeed_header_nav_button';
import { getApi } from './lib/api';

export type Setup = void;
export type Start = void;

export class NewsfeedPublicPlugin implements Plugin<Setup, Start> {
  private readonly kibanaVersion: string;
  private readonly config: NewsfeedPluginInjectedConfig;
  private readonly stop$ = new Rx.ReplaySubject(1);

  constructor(initializerContext: PluginInitializerContext) {
    this.kibanaVersion = initializerContext.env.packageInfo.version;
    this.config = initializerContext.config.get<NewsfeedPluginInjectedConfig>();
  }

  public setup(core: CoreSetup): Setup {}

  public start(core: CoreStart): Start {
    const api$ = this.fetchNewsfeed(core);
    core.chrome.navControls.registerRight({
      order: 1000,
      mount: target => this.mount(api$, target),
    });
  }

  public stop() {
    this.stop$.next();
  }

  private fetchNewsfeed(core: CoreStart) {
    return getApi(core.http, this.config.newsfeed, this.kibanaVersion).pipe(
      takeUntil(this.stop$), // stop the interval when stop method is called
      catchError(() => Rx.of(null)) // do not throw error
    );
  }

  private mount(api$: NewsfeedApiFetchResult, targetDomElement: HTMLElement) {
    ReactDOM.render(
      <I18nProvider>
        <NewsfeedNavButton apiFetchResult={api$} />
      </I18nProvider>,
      targetDomElement
    );
    return () => ReactDOM.unmountComponentAtNode(targetDomElement);
  }
}
