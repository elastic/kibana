/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import type { Logger } from '@kbn/logging';
import type { CoreSetup, CoreStart } from '../../../core/server';
import type { Plugin, PluginInitializerContext } from '../../../core/server/plugins/types';
import type { BfetchServerSetup } from '../../bfetch/server/plugin';
import type { ExpressionsServerSetup } from '../../expressions/server/plugin';
import type { FieldFormatsSetup, FieldFormatsStart } from '../../field_formats/server/types';
import type { UsageCollectionSetup } from '../../usage_collection/server/plugin';
import type { ConfigSchema } from '../config';
import { AutocompleteService } from './autocomplete/autocomplete_service';
import type { IndexPatternsServiceStart } from './index_patterns/index_patterns_service';
import { IndexPatternsServiceProvider } from './index_patterns/index_patterns_service';
import { KqlTelemetryService } from './kql_telemetry/kql_telemetry_service';
import { QueryService } from './query/query_service';
import { ScriptsService } from './scripts/scripts_service';
import { SearchService } from './search/search_service';
import type { ISearchSetup, ISearchStart, SearchEnhancements } from './search/types';
import { getUiSettings } from './ui_settings';

export interface DataEnhancements {
  search: SearchEnhancements;
}

export interface DataPluginSetup {
  search: ISearchSetup;
  /**
   * @deprecated - use "fieldFormats" plugin directly instead
   */
  fieldFormats: FieldFormatsSetup;
  /**
   * @internal
   */
  __enhance: (enhancements: DataEnhancements) => void;
}

export interface DataPluginStart {
  search: ISearchStart;
  /**
   * @deprecated - use "fieldFormats" plugin directly instead
   */
  fieldFormats: FieldFormatsStart;
  indexPatterns: IndexPatternsServiceStart;
}

export interface DataPluginSetupDependencies {
  bfetch: BfetchServerSetup;
  expressions: ExpressionsServerSetup;
  usageCollection?: UsageCollectionSetup;
  fieldFormats: FieldFormatsSetup;
}

export interface DataPluginStartDependencies {
  fieldFormats: FieldFormatsStart;
  logger: Logger;
}

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
    { bfetch, expressions, usageCollection, fieldFormats }: DataPluginSetupDependencies
  ) {
    this.scriptsService.setup(core);
    this.queryService.setup(core);
    this.autocompleteService.setup(core);
    this.kqlTelemetryService.setup(core, { usageCollection });
    this.indexPatterns.setup(core, {
      expressions,
      logger: this.logger.get('indexPatterns'),
      usageCollection,
    });

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
      fieldFormats,
    };
  }

  public start(core: CoreStart, { fieldFormats }: DataPluginStartDependencies) {
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
