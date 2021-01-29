/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { CoreSetup, CoreStart, Logger, Plugin, PluginInitializerContext } from 'src/core/server';
import { ExpressionsServerSetup } from 'src/plugins/expressions/server';
import { BfetchServerSetup } from 'src/plugins/bfetch/server';
import { ConfigSchema } from '../config';
import { IndexPatternsServiceProvider, IndexPatternsServiceStart } from './index_patterns';
import { ISearchSetup, ISearchStart, SearchEnhancements } from './search';
import { SearchService } from './search/search_service';
import { QueryService } from './query/query_service';
import { ScriptsService } from './scripts';
import { KqlTelemetryService } from './kql_telemetry';
import { UsageCollectionSetup } from '../../usage_collection/server';
import { AutocompleteService } from './autocomplete';
import { FieldFormatsService, FieldFormatsSetup, FieldFormatsStart } from './field_formats';
import { getUiSettings } from './ui_settings';

export interface DataEnhancements {
  search: SearchEnhancements;
}

export interface DataPluginSetup {
  search: ISearchSetup;
  fieldFormats: FieldFormatsSetup;
  /**
   * @internal
   */
  __enhance: (enhancements: DataEnhancements) => void;
}

export interface DataPluginStart {
  search: ISearchStart;
  fieldFormats: FieldFormatsStart;
  indexPatterns: IndexPatternsServiceStart;
}

export interface DataPluginSetupDependencies {
  bfetch: BfetchServerSetup;
  expressions: ExpressionsServerSetup;
  usageCollection?: UsageCollectionSetup;
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface DataPluginStartDependencies {}

export class DataServerPlugin
  implements
    Plugin<
      DataPluginSetup,
      DataPluginStart,
      DataPluginSetupDependencies,
      DataPluginStartDependencies
    > {
  private readonly searchService: SearchService;
  private readonly scriptsService: ScriptsService;
  private readonly kqlTelemetryService: KqlTelemetryService;
  private readonly autocompleteService: AutocompleteService;
  private readonly indexPatterns = new IndexPatternsServiceProvider();
  private readonly fieldFormats = new FieldFormatsService();
  private readonly queryService = new QueryService();
  private readonly logger: Logger;

  constructor(initializerContext: PluginInitializerContext<ConfigSchema>) {
    this.logger = initializerContext.logger.get('data');
    this.searchService = new SearchService(initializerContext, this.logger);
    this.scriptsService = new ScriptsService();
    this.kqlTelemetryService = new KqlTelemetryService(initializerContext);
    this.autocompleteService = new AutocompleteService(initializerContext);
  }

  public setup(
    core: CoreSetup<DataPluginStartDependencies, DataPluginStart>,
    { bfetch, expressions, usageCollection }: DataPluginSetupDependencies
  ) {
    this.scriptsService.setup(core);
    this.queryService.setup(core);
    this.autocompleteService.setup(core);
    this.kqlTelemetryService.setup(core, { usageCollection });
    this.indexPatterns.setup(core, { expressions });

    core.uiSettings.register(getUiSettings());

    const searchSetup = this.searchService.setup(core, {
      bfetch,
      expressions,
      usageCollection,
    });

    return {
      __enhance: (enhancements: DataEnhancements) => {
        searchSetup.__enhance(enhancements.search);
      },
      search: searchSetup,
      fieldFormats: this.fieldFormats.setup(),
    };
  }

  public start(core: CoreStart) {
    const fieldFormats = this.fieldFormats.start();
    const indexPatterns = this.indexPatterns.start(core, {
      fieldFormats,
      logger: this.logger.get('indexPatterns'),
    });

    return {
      fieldFormats,
      indexPatterns,
      search: this.searchService.start(core, { fieldFormats, indexPatterns }),
    };
  }

  public stop() {
    this.searchService.stop();
  }
}

export { DataServerPlugin as Plugin };
