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

import { i18n } from '@kbn/i18n';
import { BehaviorSubject } from 'rxjs';
import { App, AppUpdater, CoreSetup, Plugin } from 'kibana/public';
import { sortBy } from 'lodash';
import { KibanaLegacySetup } from '../../kibana_legacy/public';
import { AppNavLinkStatus } from '../../../core/public';

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
  register: (devTool: DevTool) => void;
}

export interface DevToolsStart {
  /**
   * Returns all registered dev tools in an ordered array.
   * This function is only exposed because the dev tools app
   * actually rendering the tool has to stay in the legacy platform
   * for now. Once it is moved into this plugin, this function
   * becomes an implementation detail.
   * @deprecated
   */
  getSortedDevTools: () => readonly DevTool[];
}

/**
 * Descriptor for a dev tool. A dev tool works similar to an application
 * registered in the core application service.
 */
export interface DevTool {
  /**
   * The id of the dev tools. This will become part of the URL path
   * (`dev_tools/${devTool.id}`. It has to be unique among registered
   * dev tools.
   */
  id: string;
  /**
   * The human readable name of the dev tool. Should be internationalized.
   * This will be used as a label in the tab above the actual tool.
   */
  title: string;
  mount: App['mount'];
  /**
   * Flag indicating to disable the tab of this dev tool. Navigating to a
   * disabled dev tool will be treated as the navigation to an unknown route
   * (redirect to the console).
   */
  disabled?: boolean;
  /**
   * Optional tooltip content of the tab.
   */
  tooltipContent?: string;
  /**
   * Flag indicating whether the dev tool will do routing within the `dev_tools/${devTool.id}/`
   * prefix. If it is set to true, the dev tool is responsible to redirect
   * the user when navigating to unknown URLs within the prefix. If set
   * to false only the root URL of the dev tool will be recognized as valid.
   */
  enableRouting: boolean;
  /**
   * Number used to order the tabs.
   */
  order: number;
}

export class DevToolsPlugin implements Plugin<DevToolsSetup, DevToolsStart> {
  private readonly devTools = new Map<string, DevTool>();
  private appStateUpdater = new BehaviorSubject<AppUpdater>(() => ({}));

  private getSortedDevTools(): readonly DevTool[] {
    return sortBy([...this.devTools.values()], 'order');
  }

  public setup(core: CoreSetup, { kibanaLegacy }: { kibanaLegacy: KibanaLegacySetup }) {
    core.application.register({
      id: 'dev_tools',
      title: i18n.translate('kbn.devToolsTitle', {
        defaultMessage: 'Dev Tools',
      }),
      updater$: this.appStateUpdater,
      euiIconType: 'devToolsApp',
      order: 9001,
      category: {
        label: i18n.translate('core.ui.managementNavList.label', {
          defaultMessage: 'Management',
        }),
        euiIconType: 'managementApp',
      },
      mount: async (appMountContext, params) => {
        if (!this.getSortedDevTools) {
          throw new Error('not started yet');
        }
        const { renderApp } = await import('./application');
        params.element.classList.add('devAppWrapper');
        return renderApp(
          params.element,
          appMountContext,
          params.appBasePath,
          this.getSortedDevTools()
        );
      },
    });
    kibanaLegacy.forwardApp('dev_tools', 'dev_tools');

    return {
      register: (devTool: DevTool) => {
        if (this.devTools.has(devTool.id)) {
          throw new Error(
            `Dev tool with id [${devTool.id}] has already been registered. Use a unique id.`
          );
        }

        this.devTools.set(devTool.id, devTool);
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
