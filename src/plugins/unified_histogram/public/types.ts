/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { Theme } from '@kbn/charts-plugin/public/plugin';
import type { IUiSettingsClient } from '@kbn/core/public';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import type { FieldFormatsStart } from '@kbn/field-formats-plugin/public';
import type { LensPublicStart } from '@kbn/lens-plugin/public';
import type { DataViewField } from '@kbn/data-views-plugin/public';
import type { RequestAdapter } from '@kbn/inspector-plugin/public';
import type { DefaultInspectorAdapters } from '@kbn/expressions-plugin/common';
import type { Subject } from 'rxjs';

/**
 * The fetch status of a unified histogram request
 */
export enum UnifiedHistogramFetchStatus {
  uninitialized = 'uninitialized',
  loading = 'loading',
  partial = 'partial',
  complete = 'complete',
  error = 'error',
}

/**
 * The services required by the unified histogram components
 */
export interface UnifiedHistogramServices {
  data: DataPublicPluginStart;
  theme: Theme;
  uiSettings: IUiSettingsClient;
  fieldFormats: FieldFormatsStart;
  lens: LensPublicStart;
}

/**
 * The bucketInterval object returned by {@link buildBucketInterval}
 */
export interface UnifiedHistogramBucketInterval {
  scaled?: boolean;
  description?: string;
  scale?: number;
}

export type UnifiedHistogramAdapters = Partial<DefaultInspectorAdapters>;

/**
 * Emitted when the histogram loading status changes
 */
export interface UnifiedHistogramChartLoadEvent {
  /**
   * Inspector adapters for the request
   */
  adapters: UnifiedHistogramAdapters;
}

/**
 * Context object for requests made by unified histogram components
 */
export interface UnifiedHistogramRequestContext {
  /**
   * Current search session ID
   */
  searchSessionId?: string;
  /**
   * The adapter to use for requests (does not apply to Lens requests)
   */
  adapter?: RequestAdapter;
}

/**
 * Context object for the hits count
 */
export interface UnifiedHistogramHitsContext {
  /**
   * The fetch status of the hits count request
   */
  status?: UnifiedHistogramFetchStatus;
  /**
   * The total number of hits
   */
  total?: number;
}

/**
 * Context object for the chart
 */
export interface UnifiedHistogramChartContext {
  /**
   * Controls whether or not the chart is hidden
   */
  hidden?: boolean;
  /**
   * Controls the time interval of the chart
   */
  timeInterval?: string;
  /**
   * The chart title -- sets the title property on the Lens chart input
   */
  title?: string;
}

/**
 * Context object for the histogram breakdown
 */
export interface UnifiedHistogramBreakdownContext {
  /**
   * The field used for the breakdown
   */
  field?: DataViewField;
}

/**
 * Message to refetch the chart and total hits
 */
export interface UnifiedHistogramRefetchMessage {
  type: 'refetch';
}

/**
 * Unified histogram input message
 */
export type UnifiedHistogramInputMessage = UnifiedHistogramRefetchMessage;

/**
 * Unified histogram input observable
 */
export type UnifiedHistogramInput$ = Subject<UnifiedHistogramInputMessage>;
