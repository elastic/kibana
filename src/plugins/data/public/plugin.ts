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
  CoreSetup,
  CoreStart,
  PackageInfo,
  Plugin,
  PluginInitializerContext,
} from 'src/core/public';
import { ConfigSchema } from '../config';
import { createStartServicesGetter, IStorageWrapper, Storage } from '../../kibana_utils/public';
import {
  DataPublicPluginSetup,
  DataPublicPluginStart,
  DataSetupDependencies,
  DataStartDependencies,
  InternalStartServices,
} from './types';
import { AutocompleteService } from './autocomplete';
import { SearchService } from './search/search_service';
import { FieldFormatsService } from './field_formats';
import { QueryService } from './query';
import { createIndexPatternSelect } from './ui/index_pattern_select';
import { IndexPatternsService, onRedirectNoIndexPattern } from './index_patterns';
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
} from './services';
import { createSearchBar } from './ui/search_bar/create_search_bar';
import { esaggs } from './search/expressions';
import {
  APPLY_FILTER_TRIGGER,
  ApplyFilterTriggerContext,
  VALUE_CLICK_TRIGGER,
  SELECT_RANGE_TRIGGER,
} from '../../ui_actions/public';
import {
  ACTION_GLOBAL_APPLY_FILTER,
  createFilterAction,
  createFiltersFromRangeSelectAction,
  createFiltersFromValueClickAction,
} from './actions';
import { ACTION_SELECT_RANGE, SelectRangeActionContext } from './actions/select_range_action';
import { ACTION_VALUE_CLICK, ValueClickActionContext } from './actions/value_click_action';
import { ValueClickTriggerContext, RangeSelectTriggerContext } from '../../embeddable/public';

declare module '../../ui_actions/public' {
  export interface ActionContextMapping {
    [ACTION_GLOBAL_APPLY_FILTER]: ApplyFilterTriggerContext;
    [ACTION_SELECT_RANGE]: SelectRangeActionContext;
    [ACTION_VALUE_CLICK]: ValueClickActionContext;
  }
}

export class DataPublicPlugin implements Plugin<DataPublicPluginSetup, DataPublicPluginStart> {
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
    core: CoreSetup,
    { expressions, uiActions }: DataSetupDependencies
  ): DataPublicPluginSetup {
    const startServices = createStartServicesGetter(core.getStartServices);

    const getInternalStartServices = (): InternalStartServices => {
      const { core: coreStart, self }: any = startServices();
      return {
        fieldFormats: self.fieldFormats,
        notifications: coreStart.notifications,
        uiSettings: coreStart.uiSettings,
        searchService: self.search,
        injectedMetadata: coreStart.injectedMetadata,
      };
    };

    expressions.registerFunction(esaggs);

    const queryService = this.queryService.setup({
      uiSettings: core.uiSettings,
      storage: this.storage,
    });

    uiActions.addTriggerAction(
      APPLY_FILTER_TRIGGER,
      createFilterAction(queryService.filterManager, queryService.timefilter.timefilter)
    );

    // uiActions.addTriggerAction(
    //   SELECT_RANGE_TRIGGER,
    //   selectRangeAction(queryService.filterManager, queryService.timefilter.timefilter)
    // );
    //
    // uiActions.addTriggerAction(
    //   VALUE_CLICK_TRIGGER,
    //   valueClickAction(queryService.filterManager, queryService.timefilter.timefilter)
    // );

    uiActions.registerTriggerReaction({
      originTrigger: VALUE_CLICK_TRIGGER,
      destTrigger: APPLY_FILTER_TRIGGER,
      isCompatible: async (context: ValueClickTriggerContext) => {
        const filters = await createFiltersFromValueClickAction(context.data);
        if (filters.length > 0) return true;
        return false;
      },
      originContextToDestContext: async (
        context: ValueClickTriggerContext
      ): Promise<ApplyFilterTriggerContext> => {
        const filters = await createFiltersFromValueClickAction(context.data);
        return {
          embeddable: context.embeddable,
          filters,
          timeFieldName: context.data.timeFieldName,
        };
      },
    });

    uiActions.registerTriggerReaction({
      originTrigger: SELECT_RANGE_TRIGGER,
      destTrigger: APPLY_FILTER_TRIGGER,
      isCompatible: async (context: RangeSelectTriggerContext) => {
        const filters = await createFiltersFromRangeSelectAction(context.data);
        if (filters.length > 0) return true;
        return false;
      },
      originContextToDestContext: async (
        context: RangeSelectTriggerContext
      ): Promise<ApplyFilterTriggerContext> => {
        const filters = await createFiltersFromRangeSelectAction(context.data);
        return {
          embeddable: context.embeddable,
          filters,
          timeFieldName: context.data.timeFieldName,
        };
      },
    });

    return {
      autocomplete: this.autocomplete.setup(core),
      search: this.searchService.setup(core, {
        expressions,
        getInternalStartServices,
        packageInfo: this.packageInfo,
        query: queryService,
      }),
      fieldFormats: this.fieldFormatsService.setup(core),
      query: queryService,
    };
  }

  public start(core: CoreStart, { uiActions }: DataStartDependencies): DataPublicPluginStart {
    const { uiSettings, http, notifications, savedObjects, overlays, application } = core;
    setHttp(http);
    setNotifications(notifications);
    setOverlays(overlays);
    setUiSettings(uiSettings);
    setInjectedMetadata(core.injectedMetadata);

    const fieldFormats = this.fieldFormatsService.start();
    setFieldFormats(fieldFormats);

    const indexPatterns = new IndexPatternsService({
      uiSettings,
      savedObjectsClient: savedObjects.client,
      http,
      fieldFormats,
      onNotification: (toastInputFields) => {
        notifications.toasts.add(toastInputFields);
      },
      onError: notifications.toasts.addError,
      onRedirectNoIndexPattern: onRedirectNoIndexPattern(
        application.capabilities,
        application.navigateToApp,
        overlays
      ),
    });
    setIndexPatterns(indexPatterns);

    const query = this.queryService.start(savedObjects);
    setQueryService(query);

    const search = this.searchService.start(core, {
      indexPatterns,
      fieldFormats,
    });
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
  }
}
