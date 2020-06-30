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

import {
  PluginInitializerContext,
  CoreSetup,
  CoreStart,
  Plugin,
  Logger,
} from '../../../core/server';
import { ConfigSchema } from '../config';
import { IndexPatternsService, IndexPatternsServiceStart } from './index_patterns';
import { ISearchSetup, ISearchStart } from './search';
import { SearchService } from './search/search_service';
import { QueryService } from './query/query_service';
import { ScriptsService } from './scripts';
import { KqlTelemetryService } from './kql_telemetry';
import { UsageCollectionSetup } from '../../usage_collection/server';
import { AutocompleteService } from './autocomplete';
import { FieldFormatsService, FieldFormatsSetup, FieldFormatsStart } from './field_formats';
import { getUiSettings } from './ui_settings';

export interface DataPluginSetup {
  search: ISearchSetup;
  fieldFormats: FieldFormatsSetup;
}

export interface DataPluginStart {
  search: ISearchStart;
  fieldFormats: FieldFormatsStart;
  indexPatterns: IndexPatternsServiceStart;
}

export interface DataPluginSetupDependencies {
  usageCollection?: UsageCollectionSetup;
}

export class DataServerPlugin implements Plugin<DataPluginSetup, DataPluginStart> {
  private readonly searchService: SearchService;
  private readonly scriptsService: ScriptsService;
  private readonly kqlTelemetryService: KqlTelemetryService;
  private readonly autocompleteService: AutocompleteService;
  private readonly indexPatterns = new IndexPatternsService();
  private readonly fieldFormats = new FieldFormatsService();
  private readonly queryService = new QueryService();
  private readonly logger: Logger;

  constructor(initializerContext: PluginInitializerContext<ConfigSchema>) {
    this.searchService = new SearchService(initializerContext);
    this.scriptsService = new ScriptsService();
    this.kqlTelemetryService = new KqlTelemetryService(initializerContext);
    this.autocompleteService = new AutocompleteService(initializerContext);
    this.logger = initializerContext.logger.get('data');
  }

  public setup(
    core: CoreSetup<object, DataPluginStart>,
    { usageCollection }: DataPluginSetupDependencies
  ) {
    this.indexPatterns.setup(core);
    this.scriptsService.setup(core);
    this.queryService.setup(core);
    this.autocompleteService.setup(core);
    this.kqlTelemetryService.setup(core, { usageCollection });

    core.uiSettings.register(getUiSettings());

    return {
      search: this.searchService.setup(core),
      fieldFormats: this.fieldFormats.setup(),
    };
  }

  public start(core: CoreStart) {
    const fieldFormats = this.fieldFormats.start();
    return {
      search: this.searchService.start(),
      fieldFormats,
      indexPatterns: this.indexPatterns.start(core, {
        fieldFormats,
        logger: this.logger.get('indexPatterns'),
      }),
    };
  }

  public stop() {}
}

export { DataServerPlugin as Plugin };
