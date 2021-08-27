/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { CoreSetup, CoreStart } from '../../../core/public';
import type { Plugin } from '../../../core/public/plugins/plugin';
import type { PluginInitializerContext } from '../../../core/public/plugins/plugin_context';
import { createStartServicesGetter } from '../../kibana_utils/public/core/create_start_service_getter';
import { Storage } from '../../kibana_utils/public/storage/storage';
import type { IStorageWrapper } from '../../kibana_utils/public/storage/types';
import type { UsageCollectionSetup } from '../../usage_collection/public/plugin';
import { IndexPatternsService } from '../common/index_patterns/index_patterns/index_patterns';
import { getAggsFormats } from '../common/search/aggs/utils/get_aggs_formats';
import type { ConfigSchema } from '../config';
import { ACTION_GLOBAL_APPLY_FILTER, createFilterAction } from './actions/apply_filter_action';
import { createFiltersFromRangeSelectAction } from './actions/filters/create_filters_from_range_select';
import { createFiltersFromValueClickAction } from './actions/filters/create_filters_from_value_click';
import { createSelectRangeAction } from './actions/select_range_action';
import { createValueClickAction } from './actions/value_click_action';
import { AutocompleteService } from './autocomplete/autocomplete_service';
import './index.scss';
import { getIndexPatternLoad } from './index_patterns/expressions/load_index_pattern';
import { IndexPatternsApiClient } from './index_patterns/index_patterns/index_patterns_api_client';
import { onRedirectNoIndexPattern } from './index_patterns/index_patterns/redirect_no_index_pattern';
import { SavedObjectsClientPublicToCommon } from './index_patterns/saved_objects_client_wrapper';
import { UiSettingsPublicToCommon } from './index_patterns/ui_settings_wrapper';
import type { NowProviderInternalContract } from './now_provider/now_provider';
import { NowProvider } from './now_provider/now_provider';
import { QueryService } from './query/query_service';
import { SearchService } from './search/search_service';
import {
  setIndexPatterns,
  setNotifications,
  setOverlays,
  setSearchService,
  setUiSettings,
} from './services';
import { applyFilterTrigger, APPLY_FILTER_TRIGGER } from './triggers/apply_filter_trigger';
import type {
  DataPublicPluginSetup,
  DataPublicPluginStart,
  DataSetupDependencies,
  DataStartDependencies,
} from './types';
import { createIndexPatternSelect } from './ui/index_pattern_select/create_index_pattern_select';
import { createSearchBar } from './ui/search_bar/create_search_bar';
import { getTableViewDescription } from './utils/table_inspector_view';

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
  private readonly queryService: QueryService;
  private readonly storage: IStorageWrapper;
  private usageCollection: UsageCollectionSetup | undefined;
  private readonly nowProvider: NowProviderInternalContract;

  constructor(initializerContext: PluginInitializerContext<ConfigSchema>) {
    this.searchService = new SearchService(initializerContext);
    this.queryService = new QueryService();

    this.autocomplete = new AutocompleteService(initializerContext);
    this.storage = new Storage(window.localStorage);
    this.nowProvider = new NowProvider();
  }

  public setup(
    core: CoreSetup<DataStartDependencies, DataPublicPluginStart>,
    {
      bfetch,
      expressions,
      uiActions,
      usageCollection,
      inspector,
      fieldFormats,
    }: DataSetupDependencies
  ): DataPublicPluginSetup {
    const startServices = createStartServicesGetter(core.getStartServices);

    expressions.registerFunction(getIndexPatternLoad({ getStartServices: core.getStartServices }));

    this.usageCollection = usageCollection;

    const searchService = this.searchService.setup(core, {
      bfetch,
      usageCollection,
      expressions,
      nowProvider: this.nowProvider,
    });

    const queryService = this.queryService.setup({
      uiSettings: core.uiSettings,
      storage: this.storage,
      nowProvider: this.nowProvider,
    });

    uiActions.registerTrigger(applyFilterTrigger);
    uiActions.registerAction(
      createFilterAction(queryService.filterManager, queryService.timefilter.timefilter)
    );

    inspector.registerView(
      getTableViewDescription(() => ({
        uiActions: startServices().plugins.uiActions,
        uiSettings: startServices().core.uiSettings,
        fieldFormats: startServices().self.fieldFormats,
        isFilterable: startServices().self.search.aggs.datatableUtilities.isFilterable,
      }))
    );

    fieldFormats.register(
      getAggsFormats((serializedFieldFormat) =>
        startServices().plugins.fieldFormats.deserialize(serializedFieldFormat)
      )
    );

    return {
      autocomplete: this.autocomplete.setup(core, {
        timefilter: queryService.timefilter,
        usageCollection,
      }),
      search: searchService,
      fieldFormats,
      query: queryService,
    };
  }

  public start(
    core: CoreStart,
    { uiActions, fieldFormats }: DataStartDependencies
  ): DataPublicPluginStart {
    const { uiSettings, http, notifications, savedObjects, overlays, application } = core;
    setNotifications(notifications);
    setOverlays(overlays);
    setUiSettings(uiSettings);

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

    const search = this.searchService.start(core, { fieldFormats, indexPatterns });
    setSearchService(search);

    uiActions.addTriggerAction(
      'SELECT_RANGE_TRIGGER',
      createSelectRangeAction(() => ({
        uiActions,
      }))
    );

    uiActions.addTriggerAction(
      'VALUE_CLICK_TRIGGER',
      createValueClickAction(() => ({
        uiActions,
      }))
    );

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
      nowProvider: this.nowProvider,
    };

    const SearchBar = createSearchBar({
      core,
      data: dataServices,
      storage: this.storage,
      usageCollection: this.usageCollection,
    });

    return {
      ...dataServices,
      ui: {
        IndexPatternSelect: createIndexPatternSelect(indexPatterns),
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
