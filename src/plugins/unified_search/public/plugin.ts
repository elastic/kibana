/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import './index.scss';

import { PluginInitializerContext, CoreSetup, CoreStart, Plugin } from '../../../core/public';
import { Storage, IStorageWrapper } from '../../kibana_utils/public';
import { ConfigSchema } from '../config';
import { setIndexPatterns, setTheme } from './services';
import type { UsageCollectionSetup } from '../../usage_collection/public';
import { createSearchBar } from './search_bar';
import { createIndexPatternSelect } from './index_pattern_select';
import { UnifiedSearchPluginSetup, UnifiedSearchPublicPluginStart } from './types';
import type { UnifiedSearchStartDependencies, UnifiedSearchSetupDependencies } from './types';
import { createFilterAction } from './actions/apply_filter_action';

export class UnifiedSearchPublicPlugin
  implements Plugin<UnifiedSearchPluginSetup, UnifiedSearchPublicPluginStart>
{
  private readonly storage: IStorageWrapper;
  private usageCollection: UsageCollectionSetup | undefined;

  constructor(initializerContext: PluginInitializerContext<ConfigSchema>) {
    this.storage = new Storage(window.localStorage);
  }

  public setup(
    core: CoreSetup,
    { uiActions, data }: UnifiedSearchSetupDependencies
  ): UnifiedSearchPluginSetup {
    const { query } = data;
    uiActions.registerAction(
      createFilterAction(query.filterManager, query.timefilter.timefilter, core.theme)
    );

    return {};
  }

  public start(
    core: CoreStart,
    { data, dataViews }: UnifiedSearchStartDependencies
  ): UnifiedSearchPublicPluginStart {
    setTheme(core.theme);
    setIndexPatterns(dataViews);

    const SearchBar = createSearchBar({
      core,
      data,
      storage: this.storage,
      usageCollection: this.usageCollection,
    });

    return {
      ui: {
        IndexPatternSelect: createIndexPatternSelect(dataViews),
        SearchBar,
      },
    };
  }

  public stop() {}
}
