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

import './index.scss';

import {
  PluginInitializerContext,
  CoreSetup,
  CoreStart,
  Plugin,
  PackageInfo,
} from 'src/core/public';
import { ConfigSchema } from '../config';
import { Storage, IStorageWrapper, createStartServicesGetter } from '../../kibana_utils/public';
import {
  DataPublicPluginSetup,
  DataPublicPluginStart,
  DataSetupDependencies,
  DataStartDependencies,
  DataPublicPluginEnhancements,
} from './types';
import { AutocompleteService } from './autocomplete';
import { SearchService } from './search/search_service';
import { FieldFormatsService } from './field_formats';
import { QueryService } from './query';
import { createIndexPatternSelect } from './ui/index_pattern_select';
import {
  IndexPatternsService,
  onRedirectNoIndexPattern,
  IndexPatternsApiClient,
  UiSettingsPublicToCommon,
} from './index_patterns';
import {
  setFieldFormats,
  setIndexPatterns,
  setNotifications,
  setOverlays,
  setQueryService,
  setSearchService,
  setUiSettings,
} from './services';
import { createSearchBar } from './ui/search_bar/create_search_bar';
import { esaggs } from './search/expressions';
import {
  SELECT_RANGE_TRIGGER,
  VALUE_CLICK_TRIGGER,
  APPLY_FILTER_TRIGGER,
} from '../../ui_actions/public';
import {
  ACTION_GLOBAL_APPLY_FILTER,
  createFilterAction,
  createFiltersFromValueClickAction,
  createFiltersFromRangeSelectAction,
  ApplyGlobalFilterActionContext,
  ACTION_SELECT_RANGE,
  ACTION_VALUE_CLICK,
  SelectRangeActionContext,
  ValueClickActionContext,
  createValueClickAction,
  createSelectRangeAction,
} from './actions';

import { SavedObjectsClientPublicToCommon } from './index_patterns';
import { indexPatternLoad } from './index_patterns/expressions/load_index_pattern';

declare module '../../ui_actions/public' {
  export interface ActionContextMapping {
    [ACTION_GLOBAL_APPLY_FILTER]: ApplyGlobalFilterActionContext;
    [ACTION_SELECT_RANGE]: SelectRangeActionContext;
    [ACTION_VALUE_CLICK]: ValueClickActionContext;
  }
}

export class DataPublicPlugin
  implements
    Plugin<
      DataPublicPluginSetup,
      DataPublicPluginStart,
      DataSetupDependencies,
      DataStartDependencies
    > {
  private readonly autocomplete: AutocompleteService;
  private readonly searchService: SearchService;
  private readonly fieldFormatsService: FieldFormatsService;
  private readonly queryService: QueryService;
  private readonly storage: IStorageWrapper;
  private readonly packageInfo: PackageInfo;

  constructor(initializerContext: PluginInitializerContext<ConfigSchema>) {
    this.searchService = new SearchService();
    this.queryService = new QueryService();
    this.fieldFormatsService = new FieldFormatsService();
    this.autocomplete = new AutocompleteService(initializerContext);
    this.storage = new Storage(window.localStorage);
    this.packageInfo = initializerContext.env.packageInfo;
  }

  public setup(
    core: CoreSetup<DataStartDependencies, DataPublicPluginStart>,
    { expressions, uiActions, usageCollection }: DataSetupDependencies
  ): DataPublicPluginSetup {
    const startServices = createStartServicesGetter(core.getStartServices);

    expressions.registerFunction(esaggs);
    expressions.registerFunction(indexPatternLoad);

    const queryService = this.queryService.setup({
      uiSettings: core.uiSettings,
      storage: this.storage,
    });

    uiActions.registerAction(
      createFilterAction(queryService.filterManager, queryService.timefilter.timefilter)
    );

    uiActions.addTriggerAction(
      SELECT_RANGE_TRIGGER,
      createSelectRangeAction(() => ({
        uiActions: startServices().plugins.uiActions,
      }))
    );

    uiActions.addTriggerAction(
      VALUE_CLICK_TRIGGER,
      createValueClickAction(() => ({
        uiActions: startServices().plugins.uiActions,
      }))
    );

    const searchService = this.searchService.setup(core, {
      usageCollection,
      packageInfo: this.packageInfo,
      expressions,
    });

    return {
      autocomplete: this.autocomplete.setup(core),
      search: searchService,
      fieldFormats: this.fieldFormatsService.setup(core),
      query: queryService,
      __enhance: (enhancements: DataPublicPluginEnhancements) => {
        searchService.__enhance(enhancements.search);
      },
    };
  }

  public start(core: CoreStart, { uiActions }: DataStartDependencies): DataPublicPluginStart {
    const { uiSettings, http, notifications, savedObjects, overlays, application } = core;
    setNotifications(notifications);
    setOverlays(overlays);
    setUiSettings(uiSettings);

    const fieldFormats = this.fieldFormatsService.start();
    setFieldFormats(fieldFormats);

    const indexPatterns = new IndexPatternsService({
      uiSettings: new UiSettingsPublicToCommon(uiSettings),
      savedObjectsClient: new SavedObjectsClientPublicToCommon(savedObjects.client),
      apiClient: new IndexPatternsApiClient(http),
      fieldFormats,
      onNotification: (toastInputFields) => {
        notifications.toasts.add(toastInputFields);
      },
      onError: notifications.toasts.addError.bind(notifications.toasts),
      onRedirectNoIndexPattern: onRedirectNoIndexPattern(
        application.capabilities,
        application.navigateToApp,
        overlays
      ),
    });
    setIndexPatterns(indexPatterns);

    const query = this.queryService.start({
      storage: this.storage,
      savedObjectsClient: savedObjects.client,
      uiSettings,
    });
    setQueryService(query);

    const search = this.searchService.start(core, { fieldFormats, indexPatterns });
    setSearchService(search);

    uiActions.addTriggerAction(
      APPLY_FILTER_TRIGGER,
      uiActions.getAction(ACTION_GLOBAL_APPLY_FILTER)
    );

    const dataServices = {
      actions: {
        createFiltersFromValueClickAction,
        createFiltersFromRangeSelectAction,
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
    this.queryService.stop();
    this.searchService.stop();
  }
}
