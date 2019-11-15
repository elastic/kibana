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

// This import makes sure dev tools are registered before the app is.
import 'uiExports/devTools';

import { CoreSetup, CoreStart, Plugin } from 'kibana/public';

import { LocalApplicationService } from '../local_application_service';
import { DevTool, DevToolsStart } from '../../../../../plugins/dev_tools/public';

export interface DevToolsPluginSetupDependencies {
  __LEGACY: {
    localApplicationService: LocalApplicationService;
  };
}

export interface DevToolsPluginStartDependencies {
  newPlatformDevTools: DevToolsStart;
}

export class DevToolsPlugin implements Plugin {
  private getSortedDevTools: (() => readonly DevTool[]) | null = null;

  public setup(
    core: CoreSetup,
    { __LEGACY: { localApplicationService } }: DevToolsPluginSetupDependencies
  ) {
    localApplicationService.register({
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
  }

  public start(core: CoreStart, { newPlatformDevTools }: DevToolsPluginStartDependencies) {
    this.getSortedDevTools = newPlatformDevTools.getSortedDevTools;
    if (this.getSortedDevTools().length === 0) {
      core.chrome.navLinks.update('kibana:dev_tools', {
        hidden: true,
      });
    }
  }
}
