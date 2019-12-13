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
import { IScope } from 'angular';

import { IUiActionsStart, IUiActionsSetup } from 'src/plugins/ui_actions/public';
import { IEmbeddableStart, IEmbeddableSetup } from 'src/plugins/embeddable/public';
import { DashboardEmbeddableContainerPublicPlugin } from '../../../../plugins/dashboard_embeddable_container/public/plugin';
import { LegacyCoreSetup, LegacyCoreStart, App, AppMountDeprecated } from '../../../../core/public';
import { Plugin as DataPlugin } from '../../../../plugins/data/public';
import { Plugin as ExpressionsPlugin } from '../../../../plugins/expressions/public';
import {
  Setup as InspectorSetup,
  Start as InspectorStart,
} from '../../../../plugins/inspector/public';
import { EuiUtilsStart } from '../../../../plugins/eui_utils/public';
import { DevToolsSetup, DevToolsStart } from '../../../../plugins/dev_tools/public';
import { KibanaLegacySetup, KibanaLegacyStart } from '../../../../plugins/kibana_legacy/public';
import { HomePublicPluginSetup, HomePublicPluginStart } from '../../../../plugins/home/public';
import { SharePluginSetup, SharePluginStart } from '../../../../plugins/share/public';
import { ManagementStart } from '../../../../plugins/management/public';
import { BfetchPublicSetup, BfetchPublicStart } from '../../../../plugins/bfetch/public';
import { UsageCollectionSetup } from '../../../../plugins/usage_collection/public';
import {
  NavigationPublicPluginSetup,
  NavigationPublicPluginStart,
} from '../../../../plugins/navigation/public';

export interface PluginsSetup {
  bfetch: BfetchPublicSetup;
  data: ReturnType<DataPlugin['setup']>;
  embeddable: IEmbeddableSetup;
  expressions: ReturnType<ExpressionsPlugin['setup']>;
  home: HomePublicPluginSetup;
  inspector: InspectorSetup;
  uiActions: IUiActionsSetup;
  navigation: NavigationPublicPluginSetup;
  dev_tools: DevToolsSetup;
  kibana_legacy: KibanaLegacySetup;
  share: SharePluginSetup;
  usageCollection: UsageCollectionSetup;
  dashboardEmbeddableContainer: DashboardEmbeddableContainerPublicPlugin['setup'];
}

export interface PluginsStart {
  bfetch: BfetchPublicStart;
  data: ReturnType<DataPlugin['start']>;
  embeddable: IEmbeddableStart;
  eui_utils: EuiUtilsStart;
  expressions: ReturnType<ExpressionsPlugin['start']>;
  home: HomePublicPluginStart;
  inspector: InspectorStart;
  uiActions: IUiActionsStart;
  navigation: NavigationPublicPluginStart;
  dev_tools: DevToolsStart;
  kibana_legacy: KibanaLegacyStart;
  share: SharePluginStart;
  management: ManagementStart;
}

export const npSetup = {
  core: (null as unknown) as LegacyCoreSetup,
  plugins: {} as PluginsSetup,
};

export const npStart = {
  core: (null as unknown) as LegacyCoreStart,
  plugins: {} as PluginsStart,
};

/**
 * Only used by unit tests
 * @internal
 */
export function __reset__() {
  npSetup.core = (null as unknown) as LegacyCoreSetup;
  npSetup.plugins = {} as any;
  npStart.core = (null as unknown) as LegacyCoreStart;
  npStart.plugins = {} as any;
  legacyAppRegistered = false;
}

export function __setup__(coreSetup: LegacyCoreSetup, plugins: PluginsSetup) {
  npSetup.core = coreSetup;
  npSetup.plugins = plugins;

  // Setup compatibility layer for AppService in legacy platform
  npSetup.core.application.register = legacyAppRegister;
}

export function __start__(coreStart: LegacyCoreStart, plugins: PluginsStart) {
  npStart.core = coreStart;
  npStart.plugins = plugins;
}

/** Flag used to ensure `legacyAppRegister` is only called once. */
let legacyAppRegistered = false;

/**
 * Exported for testing only. Use `npSetup.core.application.register` in legacy apps.
 * @internal
 */
export const legacyAppRegister = (app: App) => {
  if (legacyAppRegistered) {
    throw new Error(`core.application.register may only be called once for legacy plugins.`);
  }
  legacyAppRegistered = true;

  require('ui/chrome').setRootController(app.id, ($scope: IScope, $element: JQLite) => {
    const element = $element[0];

    // Root controller cannot return a Promise so use an internal async function and call it immediately
    (async () => {
      const params = { element, appBasePath: npSetup.core.http.basePath.prepend(`/app/${app.id}`) };
      const unmount = isAppMountDeprecated(app.mount)
        ? await app.mount({ core: npStart.core }, params)
        : await app.mount(params);
      $scope.$on('$destroy', () => {
        unmount();
      });
    })();
  });
};

function isAppMountDeprecated(mount: (...args: any[]) => any): mount is AppMountDeprecated {
  // Mount functions with two arguments are assumed to expect deprecated `context` object.
  return mount.length === 2;
}
