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
import { Start as EmbeddableStart, Setup as EmbeddableSetup } from 'src/plugins/embeddable/public';
import { LegacyCoreSetup, LegacyCoreStart, App } from '../../../../core/public';
import { Plugin as DataPlugin } from '../../../../plugins/data/public';
import { Plugin as ExpressionsPlugin } from '../../../../plugins/expressions/public';
import {
  Setup as InspectorSetup,
  Start as InspectorStart,
} from '../../../../plugins/inspector/public';
import { EuiUtilsStart } from '../../../../plugins/eui_utils/public';
import { DevToolsSetup, DevToolsStart } from '../../../../plugins/dev_tools/public';
import {
  FeatureCatalogueSetup,
  FeatureCatalogueStart,
} from '../../../../plugins/feature_catalogue/public';
import { SharePluginSetup, SharePluginStart } from '../../../../plugins/share/public';

export interface PluginsSetup {
  data: ReturnType<DataPlugin['setup']>;
  embeddable: EmbeddableSetup;
  expressions: ReturnType<ExpressionsPlugin['setup']>;
  feature_catalogue: FeatureCatalogueSetup;
  inspector: InspectorSetup;
  uiActions: IUiActionsSetup;
  share: SharePluginSetup;
  devTools: DevToolsSetup;
}

export interface PluginsStart {
  data: ReturnType<DataPlugin['start']>;
  embeddable: EmbeddableStart;
  eui_utils: EuiUtilsStart;
  expressions: ReturnType<ExpressionsPlugin['start']>;
  feature_catalogue: FeatureCatalogueStart;
  inspector: InspectorStart;
  uiActions: IUiActionsStart;
  share: SharePluginStart;
  devTools: DevToolsStart;
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
      const unmount = await app.mount({ core: npStart.core }, { element, appBasePath: '' });
      $scope.$on('$destroy', () => {
        unmount();
      });
    })();
  });
};
