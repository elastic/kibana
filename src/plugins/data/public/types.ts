/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { CoreStart } from '@kbn/core/public';
import { BfetchPublicSetup } from '@kbn/bfetch-plugin/public';
import { IStorageWrapper } from '@kbn/kibana-utils-plugin/public';
import { ExpressionsSetup } from '@kbn/expressions-plugin/public';
import { DataViewsPublicPluginStart } from '@kbn/data-views-plugin/public';
import { UiActionsSetup, UiActionsStart } from '@kbn/ui-actions-plugin/public';
import { FieldFormatsSetup, FieldFormatsStart } from '@kbn/field-formats-plugin/public';
import { UsageCollectionSetup, UsageCollectionStart } from '@kbn/usage-collection-plugin/public';
import { Setup as InspectorSetup } from '@kbn/inspector-plugin/public';
import { ScreenshotModePluginStart } from '@kbn/screenshot-mode-plugin/public';
import { SharePluginStart } from '@kbn/share-plugin/public';
import { ManagementSetup } from '@kbn/management-plugin/public';
import { DatatableUtilitiesService } from '../common';
import { AutocompleteSetup, AutocompleteStart } from './autocomplete';
import { createFiltersFromRangeSelectAction, createFiltersFromValueClickAction } from './actions';
import type { ISearchSetup, ISearchStart } from './search';
import { QuerySetup, QueryStart } from './query';
import { DataViewsContract } from './data_views';
import { NowProviderPublicContract } from './now_provider';

export interface DataSetupDependencies {
  bfetch: BfetchPublicSetup;
  expressions: ExpressionsSetup;
  uiActions: UiActionsSetup;
  inspector: InspectorSetup;
  usageCollection?: UsageCollectionSetup;
  fieldFormats: FieldFormatsSetup;
  management: ManagementSetup;
}

export interface DataStartDependencies {
  uiActions: UiActionsStart;
  fieldFormats: FieldFormatsStart;
  dataViews: DataViewsPublicPluginStart;
  screenshotMode: ScreenshotModePluginStart;
  share: SharePluginStart;
}

/**
 * Data plugin public Setup contract
 */
export interface DataPublicPluginSetup {
  autocomplete: AutocompleteSetup;
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
   * autocomplete service
   * {@link AutocompleteStart}
   */
  autocomplete: AutocompleteStart;
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
