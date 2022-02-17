/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { CoreSetup, CoreStart, Logger, Plugin, PluginInitializerContext } from 'src/core/server';
import { ExpressionsServerSetup } from 'src/plugins/expressions/server';
import { BfetchServerSetup } from 'src/plugins/bfetch/server';
import { PluginStart as DataViewsServerPluginStart } from 'src/plugins/data_views/server';
import { ConfigSchema } from '../config';
import { DatatableUtilitiesService } from './datatable_utilities';
import type { ISearchSetup, ISearchStart, SearchEnhancements } from './search';
import { SearchService } from './search/search_service';
import { QueryService } from './query/query_service';
import { ScriptsService } from './scripts';
import { KqlTelemetryService } from './kql_telemetry';
import { UsageCollectionSetup } from '../../usage_collection/server';
import { AutocompleteService } from './autocomplete';
import { FieldFormatsSetup, FieldFormatsStart } from '../../field_formats/server';
import { getUiSettings } from './ui_settings';
import { QuerySetup } from './query';
import { AutocompleteSetup } from './autocomplete/autocomplete_service';

interface DataEnhancements {
  search: SearchEnhancements;
}

export interface DataPluginSetup {
  autocomplete: AutocompleteSetup;
  search: ISearchSetup;
  query: QuerySetup;
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
  indexPatterns: DataViewsServerPluginStart;

  /**
   * Datatable type utility functions.
   */
  datatableUtilities: DatatableUtilitiesService;
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
  dataViews: DataViewsServerPluginStart;
}

export class DataServerPlugin
  implements
    Plugin<
      DataPluginSetup,
      DataPluginStart,
      DataPluginSetupDependencies,
      DataPluginStartDependencies
    >
{
  private readonly searchService: SearchService;
  private readonly scriptsService: ScriptsService;
  private readonly kqlTelemetryService: KqlTelemetryService;
  private readonly autocompleteService: AutocompleteService;
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
    const querySetup = this.queryService.setup(core);
    this.kqlTelemetryService.setup(core, { usageCollection });

    core.uiSettings.register(getUiSettings(core.docLinks));

    const searchSetup = this.searchService.setup(core, {
      bfetch,
      expressions,
      usageCollection,
    });

    return {
      autocomplete: this.autocompleteService.setup(core),
      __enhance: (enhancements: DataEnhancements) => {
        searchSetup.__enhance(enhancements.search);
      },
      search: searchSetup,
      query: querySetup,
      fieldFormats,
    };
  }

  public start(core: CoreStart, { fieldFormats, dataViews }: DataPluginStartDependencies) {
    const search = this.searchService.start(core, { fieldFormats, indexPatterns: dataViews });
    const datatableUtilities = new DatatableUtilitiesService(
      search.aggs,
      dataViews,
      fieldFormats,
      core.uiSettings
    );

    return {
      datatableUtilities,
      search,
      fieldFormats,
      indexPatterns: dataViews,
    };
  }

  public stop() {
    this.searchService.stop();
  }
}

export { DataServerPlugin as Plugin };
