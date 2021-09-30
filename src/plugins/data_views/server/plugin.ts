/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { CoreSetup, CoreStart, Logger, Plugin, PluginInitializerContext } from 'src/core/server';
import { ExpressionsServerSetup } from 'src/plugins/expressions/server';
import { FieldFormatsSetup, FieldFormatsStart } from '../../field_formats/server';
import { IndexPatternsServiceProvider, IndexPatternsServiceStart } from '.';
import { UsageCollectionSetup } from '../../usage_collection/server';

export interface DataViewPluginSetup {}

// todo simplify
export type DataViewPluginStart = IndexPatternsServiceStart;

export interface DataViewPluginSetupDependencies {
  fieldFormats: FieldFormatsSetup;
  expressions: ExpressionsServerSetup;
  usageCollection?: UsageCollectionSetup;
}

export interface DataViewPluginStartDependencies {
  fieldFormats: FieldFormatsStart;
  logger: Logger;
}

export class DataViewServerPlugin
  implements
    Plugin<
      DataViewPluginSetup,
      DataViewPluginStart,
      DataViewPluginSetupDependencies,
      DataViewPluginStartDependencies
    >
{
  private readonly indexPatterns = new IndexPatternsServiceProvider();
  private readonly logger: Logger;

  // todo look at this PluginInitializerContext
  constructor(initializerContext: PluginInitializerContext) {
    this.logger = initializerContext.logger.get('dataView');
  }

  public setup(
    core: CoreSetup<DataViewPluginStartDependencies, DataViewPluginStart>,
    { expressions, usageCollection }: DataViewPluginSetupDependencies
  ) {
    this.indexPatterns.setup(core, {
      expressions,
      logger: this.logger.get('indexPatterns'),
      usageCollection,
    });

    return {};
  }

  public start(core: CoreStart, { fieldFormats }: DataViewPluginStartDependencies) {
    const indexPatterns = this.indexPatterns.start(core, {
      fieldFormats,
      logger: this.logger.get('indexPatterns'),
    });

    return indexPatterns;
  }

  public stop() {}
}

export { DataViewServerPlugin as Plugin };
