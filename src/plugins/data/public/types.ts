/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import React from 'react';
import { CoreStart } from 'src/core/public';
import { BfetchPublicSetup } from 'src/plugins/bfetch/public';
import { IStorageWrapper } from 'src/plugins/kibana_utils/public';
import { ExpressionsSetup } from 'src/plugins/expressions/public';
import { UiActionsSetup, UiActionsStart } from 'src/plugins/ui_actions/public';
import { AutocompleteSetup, AutocompleteStart } from './autocomplete';
import { FieldFormatsSetup, FieldFormatsStart } from './field_formats';
import { createFiltersFromRangeSelectAction, createFiltersFromValueClickAction } from './actions';
import { ISearchSetup, ISearchStart, SearchEnhancements } from './search';
import { QuerySetup, QueryStart } from './query';
import { IndexPatternsContract } from './index_patterns';
import { IndexPatternSelectProps, StatefulSearchBarProps } from './ui';
import { UsageCollectionSetup } from '../../usage_collection/public';
import { Setup as InspectorSetup } from '../../inspector/public';
import { NowProviderPublicContract } from './now_provider';

export interface DataPublicPluginEnhancements {
  search: SearchEnhancements;
}

export interface DataSetupDependencies {
  bfetch: BfetchPublicSetup;
  expressions: ExpressionsSetup;
  uiActions: UiActionsSetup;
  inspector: InspectorSetup;
  usageCollection?: UsageCollectionSetup;
}

export interface DataStartDependencies {
  uiActions: UiActionsStart;
}

/**
 * Data plugin public Setup contract
 */
export interface DataPublicPluginSetup {
  autocomplete: AutocompleteSetup;
  search: ISearchSetup;
  fieldFormats: FieldFormatsSetup;
  query: QuerySetup;
  /**
   * @internal
   */
  __enhance: (enhancements: DataPublicPluginEnhancements) => void;
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
   * field formats service
   * {@link FieldFormatsStart}
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
}
