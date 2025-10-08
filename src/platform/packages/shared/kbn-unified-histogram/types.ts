/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type React from 'react';
import type { AggregateQuery, Query } from '@kbn/es-query';
import type { IUiSettingsClient, Capabilities } from '@kbn/core/public';
import type { DataView } from '@kbn/data-views-plugin/common';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import type { FieldFormatsStart } from '@kbn/field-formats-plugin/public';
import type {
  LensPublicStart,
  TypedLensByValueInput,
  LensEmbeddableInput,
  Suggestion,
} from '@kbn/lens-plugin/public';
import type { DataViewField, DataViewsPublicPluginStart } from '@kbn/data-views-plugin/public';
import type { RequestAdapter } from '@kbn/inspector-plugin/public';
import type { DefaultInspectorAdapters } from '@kbn/expressions-plugin/common';
import type { Subject } from 'rxjs';
import type { UiActionsStart } from '@kbn/ui-actions-plugin/public';
import type { Storage } from '@kbn/kibana-utils-plugin/public';
import type { ExpressionsStart } from '@kbn/expressions-plugin/public';
import type { PublishingSubject } from '@kbn/presentation-publishing';
import type { SerializedStyles } from '@emotion/serialize';
import type { ResizableLayoutProps } from '@kbn/resizable-layout';
import type { FieldsMetadataPublicStart } from '@kbn/fields-metadata-plugin/public';
import type { UseRequestParamsResult } from './hooks/use_request_params';

/**
 * The fetch status of a Unified Histogram request
 */
export enum UnifiedHistogramFetchStatus {
  uninitialized = 'uninitialized',
  loading = 'loading',
  partial = 'partial',
  complete = 'complete',
  error = 'error',
}

/**
 * The services required by the Unified Histogram components
 */
export interface UnifiedHistogramServices {
  data: DataPublicPluginStart;
  uiActions: UiActionsStart;
  uiSettings: IUiSettingsClient;
  fieldFormats: FieldFormatsStart;
  lens: LensPublicStart;
  storage: Storage;
  expressions: ExpressionsStart;
  capabilities: Capabilities;
  dataViews: DataViewsPublicPluginStart;
  fieldsMetadata?: FieldsMetadataPublicStart;
}

/**
 * The bucketInterval object returned by {@link buildBucketInterval}
 */
export interface UnifiedHistogramBucketInterval {
  scaled?: boolean;
  description?: string;
  scale?: number;
}

/**
 * The adapters passed up from Lens
 */
export type UnifiedHistogramAdapters = Partial<DefaultInspectorAdapters>;

/**
 * Emitted when the histogram loading status changes
 */
export interface UnifiedHistogramChartLoadEvent {
  /**
   * Inspector adapters for the request
   */
  adapters: UnifiedHistogramAdapters;
  /**
   * Observable for the data change subscription
   */
  dataLoading$?: PublishingSubject<boolean | undefined>;
}

/**
 * Context object for requests made by Unified Histogram components
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

export type UnifiedHistogramTopPanelHeightContext = ResizableLayoutProps['fixedPanelSize'];

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
 * Message to fetch the chart and total hits
 */
export interface UnifiedHistogramFetchMessage {
  type: 'fetch';
}

/**
 * Unified histogram input message
 */
export type UnifiedHistogramInputMessage = UnifiedHistogramFetchMessage;

/**
 * Unified histogram input observable
 */
export type UnifiedHistogramInput$ = Subject<UnifiedHistogramInputMessage>;

export enum UnifiedHistogramExternalVisContextStatus {
  unknown = 'unknown',
  applied = 'applied',
  automaticallyCreated = 'automaticallyCreated',
  automaticallyOverridden = 'automaticallyOverridden',
  manuallyCustomized = 'manuallyCustomized',
}

export enum UnifiedHistogramSuggestionType {
  unsupported = 'unsupported',
  lensSuggestion = 'lensSuggestion',
  histogramForESQL = 'histogramForESQL',
  histogramForDataView = 'histogramForDataView',
}

export interface UnifiedHistogramSuggestionContext {
  suggestion: Suggestion | undefined;
  type: UnifiedHistogramSuggestionType;
}

export interface LensRequestData {
  dataViewId?: string;
  timeField?: string;
  timeInterval?: string;
  breakdownField?: string;
}

/**
 * Unified Histogram type for recreating a stored Lens vis
 */
export interface UnifiedHistogramVisContext {
  attributes: TypedLensByValueInput['attributes'];
  requestData: LensRequestData;
  suggestionType: UnifiedHistogramSuggestionType;
}

// A shared interface for communication between Discover and custom components.
export interface ChartSectionProps {
  /**
   * The current search session ID
   */
  searchSessionId?: UnifiedHistogramRequestContext['searchSessionId'];
  /**
   * Required services
   */
  services: UnifiedHistogramServices;
  /**
   * The abort controller to use for requests
   */
  abortController?: AbortController;
  /**
   * The current query
   */
  dataView?: DataView;
  /**
   * The current query
   */
  query?: Query | AggregateQuery;
  /**
   * Callback to pass to the Lens embeddable to handle filter changes
   */
  onFilter?: LensEmbeddableInput['onFilter'];
  /**
   * Callback to pass to the Lens embeddable to handle brush events
   */
  onBrushEnd?: LensEmbeddableInput['onBrushEnd'];
  /**
   * CSS styles for toggleable actions container
   */
  chartToolbarCss?: SerializedStyles;
  /**
   * CSS styles for the charts section
   */
  histogramCss?: SerializedStyles;
  /**
   * Renders the toggle actions
   * @returns The toggle action elements
   */
  renderToggleActions: () => React.ReactElement | undefined;
  /**
   * The request parameters for the chart
   */
  requestParams: UseRequestParamsResult;
  /**
   * Observable for fetching the histogram data
   */
  input$: UnifiedHistogramInput$;
  /**
   * Flag indicating that the chart is currently loading
   */
  isChartLoading?: boolean;
  /**
   * Controls whether or not the chart is visible (used for Show and Hide toggle)
   */
  isComponentVisible: boolean;
}
/**
 * Supports customizing the chart (UnifiedHistogram) section in Discover
 */
export type ChartSectionConfiguration =
  | {
      /**
       * The component to render for the chart section
       */
      Component: React.ComponentType<ChartSectionProps>;
      /**
       * Controls whether or not to replace the default histogram and activate the custom chart
       */
      replaceDefaultChart: true;
      /**
       * Prefix for the local storage key used to store the chart section state, when not set, it will use the default Discover key
       */
      localStorageKeyPrefix?: string;
      /**
       * The default chart section height
       */
      defaultTopPanelHeight?: UnifiedHistogramTopPanelHeightContext;
    }
  | {
      replaceDefaultChart: false;
    };
