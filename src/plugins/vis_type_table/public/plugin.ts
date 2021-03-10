/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { PluginInitializerContext, CoreSetup, CoreStart, AsyncPlugin } from 'kibana/public';
import { Plugin as ExpressionsPublicPlugin } from 'src/plugins/expressions/public';
import { VisualizationsSetup } from 'src/plugins/visualizations/public';
import { UsageCollectionSetup } from 'src/plugins/usage_collection/public';

import { DataPublicPluginStart } from 'src/plugins/data/public';
import { KibanaLegacyStart } from 'src/plugins/kibana_legacy/public';
import { setFormatService } from './services';

interface ClientConfigType {
  legacyVisEnabled: boolean;
}

/** @internal */
export interface TablePluginSetupDependencies {
  expressions: ReturnType<ExpressionsPublicPlugin['setup']>;
  visualizations: VisualizationsSetup;
  usageCollection?: UsageCollectionSetup;
}

/** @internal */
export interface TablePluginStartDependencies {
  data: DataPublicPluginStart;
  kibanaLegacy: KibanaLegacyStart;
}

/** @internal */
export class TableVisPlugin
  implements AsyncPlugin<void, void, TablePluginSetupDependencies, TablePluginStartDependencies> {
  initializerContext: PluginInitializerContext<ClientConfigType>;

  constructor(initializerContext: PluginInitializerContext) {
    this.initializerContext = initializerContext;
  }

  public async setup(
    core: CoreSetup<TablePluginStartDependencies>,
    deps: TablePluginSetupDependencies
  ) {
    const { legacyVisEnabled } = this.initializerContext.config.get();

    if (legacyVisEnabled) {
      const { registerLegacyVis } = await import('./legacy');
      registerLegacyVis(core, deps, this.initializerContext);
    } else {
      const { registerTableVis } = await import('./register_vis');
      registerTableVis(core, deps, this.initializerContext);
    }
  }

  public start(core: CoreStart, { data }: TablePluginStartDependencies) {
    setFormatService(data.fieldFormats);
  }
}
