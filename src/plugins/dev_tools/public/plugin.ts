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

import { CoreSetup, Plugin } from 'kibana/public';
import { sortBy } from 'lodash';
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

export interface DevToolsStart {
  /**
   * Returns all registered dev tools in an ordered array.
   * This function is only exposed because the dev tools app
   * actually rendering the tool has to stay in the legacy platform
   * for now. Once it is moved into this plugin, this function
   * becomes an implementation detail.
   * @deprecated
   */
  getSortedDevTools: () => readonly DevToolApp[];
}

export class DevToolsPlugin implements Plugin<DevToolsSetup, DevToolsStart> {
  private readonly devTools = new Map<string, DevToolApp>();

  private getSortedDevTools(): readonly DevToolApp[] {
    return sortBy([...this.devTools.values()], 'order');
  }

  public setup(core: CoreSetup, { kibanaLegacy }: { kibanaLegacy: KibanaLegacySetup }) {
    kibanaLegacy.registerLegacyApp({
      id: 'dev_tools',
      title: 'Dev Tools',
      mount: async (appMountContext, params) => {
        if (!this.getSortedDevTools) {
          throw new Error('not started yet');
        }
        const { renderApp } = await import('./application');
        return renderApp(
          params.element,
          appMountContext,
          params.appBasePath,
          this.getSortedDevTools()
        );
      },
    });

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
    return {
      getSortedDevTools: this.getSortedDevTools.bind(this),
    };
  }

  public stop() {}
}
