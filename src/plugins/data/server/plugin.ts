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

import { PluginInitializerContext, CoreSetup, CoreStart, Plugin, Logger } from 'src/core/server';
import { ExpressionsServerSetup } from 'src/plugins/expressions/server';
import { ConfigSchema } from '../config';
import { IndexPatternsService, IndexPatternsServiceStart } from './index_patterns';
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
  private readonly indexPatterns = new IndexPatternsService();
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
    { expressions, usageCollection }: DataPluginSetupDependencies
  ) {
    this.indexPatterns.setup(core);
    this.scriptsService.setup(core);
    this.queryService.setup(core);
    this.autocompleteService.setup(core);
    this.kqlTelemetryService.setup(core, { usageCollection });

    core.uiSettings.register(getUiSettings());

    const searchSetup = this.searchService.setup(core, {
      registerFunction: expressions.registerFunction,
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
    return {
      search: this.searchService.start(core, { fieldFormats }),
      fieldFormats,
      indexPatterns: this.indexPatterns.start(core, {
        fieldFormats,
        logger: this.logger.get('indexPatterns'),
      }),
    };
  }

  public stop() {
    this.searchService.stop();
  }
}

export { DataServerPlugin as Plugin };
