/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { PluginInitializerContext, CoreSetup, CoreStart, Plugin } from '@kbn/core/public';
import { Storage, IStorageWrapper } from '@kbn/kibana-utils-plugin/public';
import type { UsageCollectionSetup } from '@kbn/usage-collection-plugin/public';
import { APPLY_FILTER_TRIGGER } from '@kbn/data-plugin/public';
import { createQueryStringInput } from './query_string_input/get_query_string_input';
import { UPDATE_FILTER_REFERENCES_TRIGGER, updateFilterReferencesTrigger } from './triggers';
import type { ConfigSchema } from '../server/config';
import { setIndexPatterns, setTheme, setOverlays, setAnalytics, setI18n } from './services';
import { AutocompleteService } from './autocomplete/autocomplete_service';
import { createSearchBar } from './search_bar/create_search_bar';
import { createIndexPatternSelect } from './index_pattern_select';
import type {
  UnifiedSearchStartDependencies,
  UnifiedSearchSetupDependencies,
  UnifiedSearchPluginSetup,
  UnifiedSearchPublicPluginStart,
  UnifiedSearchPublicPluginStartUi,
} from './types';
import { createFilterAction } from './actions/apply_filter_action';
import { createUpdateFilterReferencesAction } from './actions/update_filter_references_action';
import { ACTION_GLOBAL_APPLY_FILTER, UPDATE_FILTER_REFERENCES_ACTION } from './actions';
import { FiltersBuilderLazy } from './filters_builder';

import './index.scss';

export class UnifiedSearchPublicPlugin
  implements Plugin<UnifiedSearchPluginSetup, UnifiedSearchPublicPluginStart>
{
  private readonly storage: IStorageWrapper;
  private readonly autocomplete: AutocompleteService;
  private usageCollection: UsageCollectionSetup | undefined;

  constructor(initializerContext: PluginInitializerContext<ConfigSchema>) {
    this.storage = new Storage(window.localStorage);

    this.autocomplete = new AutocompleteService(initializerContext);
  }

  public setup(
    core: CoreSetup<UnifiedSearchStartDependencies, UnifiedSearchPublicPluginStart>,
    { uiActions, data, usageCollection }: UnifiedSearchSetupDependencies
  ): UnifiedSearchPluginSetup {
    const { query } = data;

    uiActions.registerTrigger(updateFilterReferencesTrigger);

    uiActions.registerAction(
      createFilterAction(query.filterManager, query.timefilter.timefilter, core)
    );

    uiActions.registerAction(createUpdateFilterReferencesAction(query.filterManager));
    this.usageCollection = usageCollection;

    return {
      autocomplete: this.autocomplete.setup(core, {
        timefilter: query.timefilter,
        usageCollection,
      }),
    };
  }

  public start(
    core: CoreStart,
    { data, dataViews, uiActions, screenshotMode }: UnifiedSearchStartDependencies
  ): UnifiedSearchPublicPluginStart {
    setAnalytics(core.analytics);
    setI18n(core.i18n);
    setTheme(core.theme);
    setOverlays(core.overlays);
    setIndexPatterns(dataViews);
    const autocompleteStart = this.autocomplete.start();

    /*
     *
     *  unifiedsearch uses global data service to create stateful search bar.
     *  This function helps in creating a search bar with different instances of data service
     *  so that it can be easy to use multiple stateful searchbars in the single applications
     *
     * */
    const getCustomSearchBar: UnifiedSearchPublicPluginStartUi['getCustomSearchBar'] = (
      customDataService
    ) =>
      createSearchBar({
        core,
        data: customDataService ?? data,
        storage: this.storage,
        usageCollection: this.usageCollection,
        isScreenshotMode: Boolean(screenshotMode?.isScreenshotMode()),
        unifiedSearch: {
          autocomplete: autocompleteStart,
        },
      });

    const SearchBar = getCustomSearchBar();

    uiActions.attachAction(APPLY_FILTER_TRIGGER, ACTION_GLOBAL_APPLY_FILTER);

    uiActions.attachAction(UPDATE_FILTER_REFERENCES_TRIGGER, UPDATE_FILTER_REFERENCES_ACTION);

    return {
      ui: {
        IndexPatternSelect: createIndexPatternSelect(dataViews),
        SearchBar,
        getCustomSearchBar,
        AggregateQuerySearchBar: SearchBar,
        FiltersBuilderLazy,
        QueryStringInput: createQueryStringInput({
          data,
          dataViews,
          docLinks: core.docLinks,
          http: core.http,
          notifications: core.notifications,
          storage: this.storage,
          uiSettings: core.uiSettings,
          unifiedSearch: {
            autocomplete: autocompleteStart,
          },
        }),
      },
      autocomplete: autocompleteStart,
    };
  }

  public stop() {
    this.autocomplete.clearProviders();
  }
}
