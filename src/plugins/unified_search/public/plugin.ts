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
import { UPDATE_FILTER_REFERENCES_TRIGGER, updateFilterReferencesTrigger } from './triggers';
import { ConfigSchema } from '../config';
import { setIndexPatterns, setTheme, setOverlays } from './services';
import { AutocompleteService } from './autocomplete/autocomplete_service';
import { createSearchBar } from './search_bar/create_search_bar';
import { createIndexPatternSelect } from './index_pattern_select';
import type {
  UnifiedSearchStartDependencies,
  UnifiedSearchSetupDependencies,
  UnifiedSearchPluginSetup,
  UnifiedSearchPublicPluginStart,
} from './types';
import { createFilterAction } from './actions/apply_filter_action';
import { createUpdateFilterReferencesAction } from './actions/update_filter_references_action';
import { ACTION_GLOBAL_APPLY_FILTER, UPDATE_FILTER_REFERENCES_ACTION } from './actions';

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
    plugins: UnifiedSearchSetupDependencies
  ): UnifiedSearchPluginSetup {
    const {
      data: { query },
      uiActions,
      usageCollection,
    } = plugins;

    uiActions.registerTrigger(updateFilterReferencesTrigger);

    uiActions.registerAction(
      createFilterAction(query.filterManager, query.timefilter.timefilter, core.theme)
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
    plugins: UnifiedSearchStartDependencies
  ): UnifiedSearchPublicPluginStart {
    const { data, dataViews, uiActions, screenshotMode } = plugins;

    setTheme(core.theme);
    setOverlays(core.overlays);
    setIndexPatterns(dataViews);

    const autocompleteStart = this.autocomplete.start();

    const IndexPatternSelect = createIndexPatternSelect(dataViews);

    const SearchBar = createSearchBar({
      core,
      data,
      storage: this.storage,
      isScreenshotMode: Boolean(screenshotMode?.isScreenshotMode()),
      unifiedSearch: {
        autocomplete: autocompleteStart,
      },
      usageCollection: this.usageCollection,
    });

    uiActions.attachAction(APPLY_FILTER_TRIGGER, ACTION_GLOBAL_APPLY_FILTER);

    uiActions.attachAction(UPDATE_FILTER_REFERENCES_TRIGGER, UPDATE_FILTER_REFERENCES_ACTION);

    return {
      ui: {
        AggregateQuerySearchBar: SearchBar,
        SearchBar,
        IndexPatternSelect,
      },
      autocomplete: autocompleteStart,
    };
  }

  public stop() {
    this.autocomplete.clearProviders();
  }
}
