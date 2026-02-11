/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ExpressionsSetup } from '@kbn/expressions-plugin/public';
import type { DataViewsPublicPluginStart } from '@kbn/data-views-plugin/public';
import type { UiActionsSetup, UiActionsStart } from '@kbn/ui-actions-plugin/public';
import type { FieldFormatsSetup, FieldFormatsStart } from '@kbn/field-formats-plugin/public';
import type { UsageCollectionSetup } from '@kbn/usage-collection-plugin/public';
import type {
  Setup as InspectorSetup,
  Start as InspectorStartContract,
} from '@kbn/inspector-plugin/public';
import type { ScreenshotModePluginStart } from '@kbn/screenshot-mode-plugin/public';
import type { SharePluginStart } from '@kbn/share-plugin/public';
import type { ManagementSetup } from '@kbn/management-plugin/public';
import type { Filter } from '@kbn/es-query';
import type { DataViewsContract } from '@kbn/data-views-plugin/public';
import type { CPSPluginStart } from '@kbn/cps/public';
import type { DatatableUtilitiesService } from '../common';
import type { ISearchSetup, ISearchStart } from './search';
import type { QuerySetup, QueryStart } from './query';
import type { NowProviderPublicContract } from './now_provider';
import type {
  MultiValueClickDataContext,
  RangeSelectDataContext,
  ValueClickDataContext,
} from './actions/filters';

export interface DataSetupDependencies {
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
  inspector: InspectorStartContract;
  screenshotMode: ScreenshotModePluginStart;
  share: SharePluginStart;
  cps?: CPSPluginStart;
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
  createFiltersFromValueClickAction: (context: ValueClickDataContext) => Promise<Filter[]>;
  createFiltersFromRangeSelectAction: (event: RangeSelectDataContext) => Promise<Filter[]>;
  createFiltersFromMultiValueClickAction: (
    context: MultiValueClickDataContext
  ) => Promise<Filter[] | undefined>;
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
