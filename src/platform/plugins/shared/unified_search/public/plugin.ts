/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { CoreSetup, CoreStart, Plugin } from '@kbn/core/public';
import type { IStorageWrapper } from '@kbn/kibana-utils-plugin/public';
import { Storage } from '@kbn/kibana-utils-plugin/public';
import type { UsageCollectionSetup } from '@kbn/usage-collection-plugin/public';
import {
  APPLY_FILTER_TRIGGER,
  UPDATE_FILTER_REFERENCES_TRIGGER,
} from '@kbn/ui-actions-plugin/common/trigger_ids';
import { setCoreStart, setIndexPatterns } from './services';
import { createSearchBar } from './search_bar/create_search_bar';
import { createIndexPatternSelect } from './index_pattern_select';
import type {
  UnifiedSearchStartDependencies,
  UnifiedSearchSetupDependencies,
  UnifiedSearchPluginSetup,
  UnifiedSearchPublicPluginStart,
  UnifiedSearchPublicPluginStartUi,
} from './types';
import { ACTION_GLOBAL_APPLY_FILTER, UPDATE_FILTER_REFERENCES_ACTION } from './actions/constants';
import { FiltersBuilderLazy } from './filters_builder';

export class UnifiedSearchPublicPlugin
  implements Plugin<UnifiedSearchPluginSetup, UnifiedSearchPublicPluginStart>
{
  private readonly storage: IStorageWrapper;
  private usageCollection: UsageCollectionSetup | undefined;

  constructor() {
    this.storage = new Storage(window.localStorage);
  }

  public setup(
    core: CoreSetup<UnifiedSearchStartDependencies, UnifiedSearchPublicPluginStart>,
    { uiActions, data, usageCollection }: UnifiedSearchSetupDependencies
  ): UnifiedSearchPluginSetup {
    this.usageCollection = usageCollection;

    return {};
  }

  public start(
    core: CoreStart,
    {
      data,
      dataViews,
      uiActions,
      screenshotMode,
      cps: crossProjectSearch,
      kql: { autocomplete: autocompleteStart },
    }: UnifiedSearchStartDependencies
  ): UnifiedSearchPublicPluginStart {
    setCoreStart(core);
    setIndexPatterns(dataViews);

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
        kql: {
          autocomplete: autocompleteStart,
        },
        cps: crossProjectSearch,
      });

    const SearchBar = getCustomSearchBar();

    uiActions.addTriggerActionAsync(APPLY_FILTER_TRIGGER, ACTION_GLOBAL_APPLY_FILTER, async () => {
      const { createFilterAction } = await import('./actions/actions_module');
      return createFilterAction(data.query.filterManager, data.query.timefilter.timefilter, core);
    });

    uiActions.addTriggerActionAsync(
      UPDATE_FILTER_REFERENCES_TRIGGER,
      UPDATE_FILTER_REFERENCES_ACTION,
      async () => {
        const { createUpdateFilterReferencesAction } = await import('./actions/actions_module');
        return createUpdateFilterReferencesAction(data.query.filterManager);
      }
    );

    return {
      ui: {
        IndexPatternSelect: createIndexPatternSelect(dataViews),
        SearchBar,
        getCustomSearchBar,
        AggregateQuerySearchBar: SearchBar,
        FiltersBuilderLazy,
      },
    };
  }
}
