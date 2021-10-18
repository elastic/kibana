/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import './index.scss';

import { PluginInitializerContext, CoreSetup, CoreStart, Plugin } from 'src/core/public';
import { ConfigSchema } from '../config';
import { Storage, IStorageWrapper, createStartServicesGetter } from '../../kibana_utils/public';
import {
  DataPublicPluginSetup,
  DataPublicPluginStart,
  DataSetupDependencies,
  DataStartDependencies,
} from './types';
import { AutocompleteService } from './autocomplete';
import { SearchService } from './search/search_service';
import { QueryService } from './query';
import { createIndexPatternSelect } from './ui/index_pattern_select';
import {
  setIndexPatterns,
  setNotifications,
  setOverlays,
  setSearchService,
  setUiSettings,
} from './services';
import { createSearchBar } from './ui/search_bar/create_search_bar';
import {
  ACTION_GLOBAL_APPLY_FILTER,
  createFilterAction,
  createFiltersFromValueClickAction,
  createFiltersFromRangeSelectAction,
  createValueClickAction,
  createSelectRangeAction,
} from './actions';
import { APPLY_FILTER_TRIGGER, applyFilterTrigger } from './triggers';
import { UsageCollectionSetup } from '../../usage_collection/public';
import { getTableViewDescription } from './utils/table_inspector_view';
import { NowProvider, NowProviderInternalContract } from './now_provider';
import { getAggsFormats } from '../common';

export class DataPublicPlugin
  implements
    Plugin<
      DataPublicPluginSetup,
      DataPublicPluginStart,
      DataSetupDependencies,
      DataStartDependencies
    >
{
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
      query: queryService,
    };
  }

  public start(
    core: CoreStart,
    { uiActions, fieldFormats, dataViews }: DataStartDependencies
  ): DataPublicPluginStart {
    const { uiSettings, notifications, overlays } = core;
    setNotifications(notifications);
    setOverlays(overlays);
    setUiSettings(uiSettings);
    setIndexPatterns(dataViews);

    const query = this.queryService.start({
      storage: this.storage,
      http: core.http,
      uiSettings,
    });

    const search = this.searchService.start(core, { fieldFormats, indexPatterns: dataViews });
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
      indexPatterns: dataViews,
      dataViews,
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
        IndexPatternSelect: createIndexPatternSelect(dataViews),
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
