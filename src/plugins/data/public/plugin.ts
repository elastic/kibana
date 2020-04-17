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
  PackageInfo,
} from 'src/core/public';
import { Storage, IStorageWrapper } from '../../kibana_utils/public';
import {
  DataPublicPluginSetup,
  DataPublicPluginStart,
  DataSetupDependencies,
  DataStartDependencies,
  GetInternalStartServicesFn,
} from './types';
import { AutocompleteService } from './autocomplete';
import { SearchService } from './search/search_service';
import { FieldFormatsService } from './field_formats';
import { QueryService } from './query';
import { createIndexPatternSelect } from './ui/index_pattern_select';
import { IndexPatternsService } from './index_patterns';
import {
  setFieldFormats,
  setHttp,
  setIndexPatterns,
  setInjectedMetadata,
  setNotifications,
  setOverlays,
  setQueryService,
  setSearchService,
  setUiSettings,
  getFieldFormats,
  getNotifications,
} from './services';
import { createSearchBar } from './ui/search_bar/create_search_bar';
import { esaggs } from './search/expressions';
import {
  SELECT_RANGE_TRIGGER,
  VALUE_CLICK_TRIGGER,
  APPLY_FILTER_TRIGGER,
} from '../../ui_actions/public';
import { ACTION_GLOBAL_APPLY_FILTER, createFilterAction, createFiltersFromEvent } from './actions';
import { ApplyGlobalFilterActionContext } from './actions/apply_filter_action';
import {
  selectRangeAction,
  SelectRangeActionContext,
  ACTION_SELECT_RANGE,
} from './actions/select_range_action';
import {
  valueClickAction,
  ACTION_VALUE_CLICK,
  ValueClickActionContext,
} from './actions/value_click_action';

declare module '../../ui_actions/public' {
  export interface ActionContextMapping {
    [ACTION_GLOBAL_APPLY_FILTER]: ApplyGlobalFilterActionContext;
    [ACTION_SELECT_RANGE]: SelectRangeActionContext;
    [ACTION_VALUE_CLICK]: ValueClickActionContext;
  }
}

export class DataPublicPlugin implements Plugin<DataPublicPluginSetup, DataPublicPluginStart> {
  private readonly autocomplete = new AutocompleteService();
  private readonly searchService: SearchService;
  private readonly fieldFormatsService: FieldFormatsService;
  private readonly queryService: QueryService;
  private readonly storage: IStorageWrapper;
  private readonly packageInfo: PackageInfo;

  constructor(initializerContext: PluginInitializerContext) {
    this.searchService = new SearchService();
    this.queryService = new QueryService();
    this.fieldFormatsService = new FieldFormatsService();
    this.storage = new Storage(window.localStorage);
    this.packageInfo = initializerContext.env.packageInfo;
  }

  public setup(
    core: CoreSetup,
    { expressions, uiActions }: DataSetupDependencies
  ): DataPublicPluginSetup {
    setInjectedMetadata(core.injectedMetadata);

    expressions.registerFunction(esaggs);

    const getInternalStartServices: GetInternalStartServicesFn = () => ({
      fieldFormats: getFieldFormats(),
      notifications: getNotifications(),
    });

    const queryService = this.queryService.setup({
      uiSettings: core.uiSettings,
      storage: this.storage,
    });

    uiActions.registerAction(
      createFilterAction(queryService.filterManager, queryService.timefilter.timefilter)
    );

    uiActions.attachAction(
      SELECT_RANGE_TRIGGER,
      selectRangeAction(queryService.filterManager, queryService.timefilter.timefilter)
    );

    uiActions.attachAction(
      VALUE_CLICK_TRIGGER,
      valueClickAction(queryService.filterManager, queryService.timefilter.timefilter)
    );

    return {
      autocomplete: this.autocomplete.setup(core),
      search: this.searchService.setup(core, {
        getInternalStartServices,
        packageInfo: this.packageInfo,
        query: queryService,
      }),
      fieldFormats: this.fieldFormatsService.setup(core),
      query: queryService,
    };
  }

  public start(core: CoreStart, { uiActions }: DataStartDependencies): DataPublicPluginStart {
    const { uiSettings, http, notifications, savedObjects, overlays } = core;
    setHttp(http);
    setNotifications(notifications);
    setOverlays(overlays);
    setUiSettings(uiSettings);

    const fieldFormats = this.fieldFormatsService.start();
    setFieldFormats(fieldFormats);

    const indexPatterns = new IndexPatternsService(uiSettings, savedObjects.client, http);
    setIndexPatterns(indexPatterns);

    const query = this.queryService.start(savedObjects);
    setQueryService(query);

    const search = this.searchService.start(core, { fieldFormats, indexPatterns });
    setSearchService(search);

    uiActions.attachAction(APPLY_FILTER_TRIGGER, uiActions.getAction(ACTION_GLOBAL_APPLY_FILTER));

    const dataServices = {
      actions: {
        createFiltersFromEvent,
      },
      autocomplete: this.autocomplete.start(),
      fieldFormats,
      indexPatterns,
      query,
      search,
    };

    const SearchBar = createSearchBar({
      core,
      data: dataServices,
      storage: this.storage,
    });

    return {
      ...dataServices,
      ui: {
        IndexPatternSelect: createIndexPatternSelect(core.savedObjects.client),
        SearchBar,
      },
    };
  }

  public stop() {
    this.autocomplete.clearProviders();
  }
}
