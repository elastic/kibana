/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { CoreSetup, CoreStart, Plugin } from 'kibana/public';
import { Plugin as ExpressionsPublicPlugin } from '../../../expressions/public';
import { VisualizationsSetup } from '../../../visualizations/public';
import { UsageCollectionSetup } from '../../../usage_collection/public';

import { DataPublicPluginStart } from '../../../data/public';
import { setFormatService } from './services';
import { registerTableVis } from './register_vis';

/** @internal */
export interface TablePluginSetupDependencies {
  expressions: ReturnType<ExpressionsPublicPlugin['setup']>;
  visualizations: VisualizationsSetup;
  usageCollection?: UsageCollectionSetup;
}

/** @internal */
export interface TablePluginStartDependencies {
  data: DataPublicPluginStart;
}

/** @internal */
export class TableVisPlugin
  implements Plugin<void, void, TablePluginSetupDependencies, TablePluginStartDependencies>
{
  public setup(core: CoreSetup<TablePluginStartDependencies>, deps: TablePluginSetupDependencies) {
    registerTableVis(core, deps);
  }

  public start(core: CoreStart, { data }: TablePluginStartDependencies) {
    setFormatService(data.fieldFormats);
  }
}
