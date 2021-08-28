/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import type { CoreStart } from '../../../core/public/types';
import type { BfetchPublicSetup } from '../../bfetch/public/plugin/types';
import type { ExpressionsSetup } from '../../expressions/public/plugin';
import type { FieldFormatsSetup, FieldFormatsStart } from '../../field_formats/public/plugin';
import type { Setup as InspectorSetup } from '../../inspector/public/plugin';
import type { IStorageWrapper } from '../../kibana_utils/public/storage/types';
import type { UiActionsSetup, UiActionsStart } from '../../ui_actions/public/plugin';
import type {
  UsageCollectionSetup,
  UsageCollectionStart,
} from '../../usage_collection/public/plugin';
import type { IndexPatternsContract } from '../common/index_patterns/index_patterns/index_patterns';
import { createFiltersFromRangeSelectAction } from './actions/filters/create_filters_from_range_select';
import { createFiltersFromValueClickAction } from './actions/filters/create_filters_from_value_click';
import type { AutocompleteSetup, AutocompleteStart } from './autocomplete/autocomplete_service';
import type { NowProviderPublicContract } from './now_provider/now_provider';
import type { QuerySetup, QueryStart } from './query/query_service';
import type { ISearchSetup, ISearchStart } from './search/types';
import type { IndexPatternSelectProps } from './ui/index_pattern_select/index_pattern_select';
import type { StatefulSearchBarProps } from './ui/search_bar/create_search_bar';

export interface DataSetupDependencies {
  bfetch: BfetchPublicSetup;
  expressions: ExpressionsSetup;
  uiActions: UiActionsSetup;
  inspector: InspectorSetup;
  usageCollection?: UsageCollectionSetup;
  fieldFormats: FieldFormatsSetup;
}

export interface DataStartDependencies {
  uiActions: UiActionsStart;
  fieldFormats: FieldFormatsStart;
}

/**
 * Data plugin public Setup contract
 */
export interface DataPublicPluginSetup {
  autocomplete: AutocompleteSetup;
  search: ISearchSetup;
  /**
   * @deprecated Use fieldFormats plugin instead
   */
  fieldFormats: FieldFormatsSetup;
  query: QuerySetup;
}

/**
 * Data plugin prewired UI components
 */
export interface DataPublicPluginStartUi {
  IndexPatternSelect: React.ComponentType<IndexPatternSelectProps>;
  SearchBar: React.ComponentType<StatefulSearchBarProps>;
}

/**
 * utilities to generate filters from action context
 */
export interface DataPublicPluginStartActions {
  createFiltersFromValueClickAction: typeof createFiltersFromValueClickAction;
  createFiltersFromRangeSelectAction: typeof createFiltersFromRangeSelectAction;
}

/**
 * Data plugin public Start contract
 */
export interface DataPublicPluginStart {
  /**
   * filter creation utilities
   * {@link DataPublicPluginStartActions}
   */
  actions: DataPublicPluginStartActions;
  /**
   * autocomplete service
   * {@link AutocompleteStart}
   */
  autocomplete: AutocompleteStart;
  /**
   * index patterns service
   * {@link IndexPatternsContract}
   */
  indexPatterns: IndexPatternsContract;
  /**
   * search service
   * {@link ISearchStart}
   */
  search: ISearchStart;
  /**
   * @deprecated Use fieldFormats plugin instead
   */
  fieldFormats: FieldFormatsStart;
  /**
   * query service
   * {@link QueryStart}
   */
  query: QueryStart;
  /**
   * prewired UI components
   * {@link DataPublicPluginStartUi}
   */
  ui: DataPublicPluginStartUi;

  nowProvider: NowProviderPublicContract;
}

export interface IDataPluginServices extends Partial<CoreStart> {
  appName: string;
  uiSettings: CoreStart['uiSettings'];
  savedObjects: CoreStart['savedObjects'];
  notifications: CoreStart['notifications'];
  http: CoreStart['http'];
  storage: IStorageWrapper;
  data: DataPublicPluginStart;
  usageCollection?: UsageCollectionStart;
}
