/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { CoreStart } from 'src/core/public';
import { BfetchPublicSetup } from 'src/plugins/bfetch/public';
import { IStorageWrapper } from 'src/plugins/kibana_utils/public';
import { ExpressionsSetup } from 'src/plugins/expressions/public';
import { DataViewsPublicPluginStart } from 'src/plugins/data_views/public';
import { UiActionsSetup, UiActionsStart } from 'src/plugins/ui_actions/public';
import { FieldFormatsSetup, FieldFormatsStart } from 'src/plugins/field_formats/public';
import { DatatableUtilitiesService } from '../common';
import { createFiltersFromRangeSelectAction, createFiltersFromValueClickAction } from './actions';
import type { ISearchSetup, ISearchStart } from './search';
import { QuerySetup, QueryStart } from './query';
import { DataViewsContract } from './data_views';
import { UsageCollectionSetup, UsageCollectionStart } from '../../usage_collection/public';
import { Setup as InspectorSetup } from '../../inspector/public';
import { NowProviderPublicContract } from './now_provider';

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
  dataViews: DataViewsPublicPluginStart;
  autocomplete: '';
}

/**
 * Data plugin public Setup contract
 */
export interface DataPublicPluginSetup {
  search: ISearchSetup;
  query: QuerySetup;
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
   * data views service
   * {@link DataViewsContract}
   */
  dataViews: DataViewsContract;

  /**
   * Datatable type utility functions.
   */
  datatableUtilities: DatatableUtilitiesService;

  /**
   * index patterns service
   * {@link DataViewsContract}
   * @deprecated Use dataViews service instead.  All index pattern interfaces were renamed.
   */
  indexPatterns: DataViewsContract;
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
