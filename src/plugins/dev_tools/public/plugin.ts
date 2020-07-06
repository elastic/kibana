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

import { BehaviorSubject } from 'rxjs';
import { Plugin, CoreSetup, AppMountParameters } from 'src/core/public';
import { AppUpdater } from 'kibana/public';
import { i18n } from '@kbn/i18n';
import { sortBy } from 'lodash';

import { AppNavLinkStatus, DEFAULT_APP_CATEGORIES } from '../../../core/public';
import { KibanaLegacySetup } from '../../kibana_legacy/public';
import { CreateDevToolArgs, DevToolApp, createDevToolApp } from './dev_tool';

import './index.scss';

export interface DevToolsSetup {
  /**
   * Register a developer tool. It will be available
   * in the dev tools app under a separate tab.
   *
   * Registering dev tools works almost similar to registering
   * applications in the core application service,
   * but they will be rendered with a frame containing tabs
   * to switch between the tools.
   * @param devTool The dev tools descriptor
   */
  register: (devTool: CreateDevToolArgs) => DevToolApp;
}

export class DevToolsPlugin implements Plugin<DevToolsSetup, void> {
  private readonly devTools = new Map<string, DevToolApp>();
  private appStateUpdater = new BehaviorSubject<AppUpdater>(() => ({}));

  private getSortedDevTools(): readonly DevToolApp[] {
    return sortBy([...this.devTools.values()], 'order');
  }

  public setup(coreSetup: CoreSetup, { kibanaLegacy }: { kibanaLegacy: KibanaLegacySetup }) {
    const { application: applicationSetup, getStartServices } = coreSetup;

    applicationSetup.register({
      id: 'dev_tools',
      title: i18n.translate('devTools.devToolsTitle', {
        defaultMessage: 'Dev Tools',
      }),
      updater$: this.appStateUpdater,
      euiIconType: 'devToolsApp',
      order: 9001,
      category: DEFAULT_APP_CATEGORIES.management,
      mount: async (params: AppMountParameters) => {
        const { element, history } = params;
        element.classList.add('devAppWrapper');

        const [core] = await getStartServices();
        const { application, chrome } = core;

        const { renderApp } = await import('./application');
        return renderApp(element, application, chrome, history, this.getSortedDevTools());
      },
    });

    kibanaLegacy.forwardApp('dev_tools', 'dev_tools');

    return {
      register: (devToolArgs: CreateDevToolArgs) => {
        if (this.devTools.has(devToolArgs.id)) {
          throw new Error(
            `Dev tool with id [${devToolArgs.id}] has already been registered. Use a unique id.`
          );
        }

        const devTool = createDevToolApp(devToolArgs);
        this.devTools.set(devTool.id, devTool);
        return devTool;
      },
    };
  }

  public start() {
    if (this.getSortedDevTools().length === 0) {
      this.appStateUpdater.next(() => ({ navLinkStatus: AppNavLinkStatus.hidden }));
    }
  }

  public stop() {}
}
