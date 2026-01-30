/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DataTableRecord } from '@kbn/discover-utils';
import type { FunctionComponent, PropsWithChildren } from 'react';
import type { DataGridCellValueElementProps } from '@kbn/unified-data-table';
import type { Query, TimeRange } from '@kbn/es-query';
import type {
  SpanLinks,
  ErrorsByTraceId,
  TraceRootSpan,
  UnifiedSpanDocument,
  FocusedTraceWaterfallProps,
  FullTraceWaterfallProps,
} from '@kbn/apm-types';
import type { HistogramItem, ProcessorEvent } from '@kbn/apm-types-shared';
import type { DataView } from '@kbn/data-views-plugin/common';
import type React from 'react';
import type { IndicatorType } from '@kbn/slo-schema';
import type { FeaturesRegistry } from '../../../common';

/**
 * Features types
 * Here goes the contract definition for the client features that can be registered
 * and that will be consumed by Discover.
 */

/**
 * Allow to register an AIAssistant scoped to investigate log entries.
 * It will be opinionatedly used as an additional tool to investigate a log document and
 * will be shown on the logs-overview preset tab of the UnifiedDocViewer.
 */

export interface ObservabilityStreamsFeatureRenderDeps {
  doc: DataTableRecord;
  dataView: DataView;
}

export interface ObservabilityStreamsFeature {
  id: 'streams';
  renderFlyoutStreamField: (deps: ObservabilityStreamsFeatureRenderDeps) => JSX.Element;
  renderFlyoutStreamProcessingLink: (deps: ObservabilityStreamsFeatureRenderDeps) => JSX.Element;
}

export interface ObservabilityLogsAIAssistantFeatureRenderDeps {
  doc: DataTableRecord;
}
export interface ObservabilityLogsAIAssistantFeature {
  id: 'observability-logs-ai-assistant';
  render: (deps: ObservabilityLogsAIAssistantFeatureRenderDeps) => JSX.Element;
}

export interface ObservabilityLogsAiInsightFeatureRenderDeps {
  doc: DataTableRecord;
}
export interface ObservabilityLogsAIInsightFeature {
  id: 'observability-logs-ai-insight';
  render: (deps: ObservabilityLogsAiInsightFeatureRenderDeps) => JSX.Element;
}

export interface ObservabilityCreateSLOFeature {
  id: 'observability-create-slo';
  createSLOFlyout: (props: {
    onClose: () => void;
    initialValues: Record<string, unknown>;
    formSettings?: { isEditMode?: boolean; allowedIndicatorTypes?: IndicatorType[] };
  }) => React.ReactNode;
}

export interface ObservabilityLogsFetchDocumentByIdFeature {
  id: 'observability-logs-fetch-document-by-id';
  fetchLogDocumentById: (
    params: {
      id: string;
      index?: string;
    },
    signal: AbortSignal
  ) => Promise<
    | {
        _index: string;
        fields: Record<PropertyKey, any> | undefined;
      }
    | undefined
  >;
}

export interface ObservabilityLogEventsFeature {
  id: 'observability-log-events';
  render: (props: {
    query?: Query;
    nonHighlightingQuery?: Query;
    timeRange: TimeRange;
    index: string;
    displayOptions?: {
      solutionNavIdOverride: 'oblt';
      enableDocumentViewer: false;
      enableFilters: false;
    };
  }) => JSX.Element;
}

/** **************** Security Solution ****************/

export interface SecuritySolutionCellRendererFeature {
  id: 'security-solution-cell-renderer';
  getRenderer: () => Promise<
    (fieldName: string) => FunctionComponent<DataGridCellValueElementProps> | undefined
  >;
}

export interface SecuritySolutionAppWrapperFeature {
  id: 'security-solution-app-wrapper';
  getWrapper: () => Promise<() => FunctionComponent<PropsWithChildren<{}>>>;
}

export type SecuritySolutionFeature =
  | SecuritySolutionCellRendererFeature
  | SecuritySolutionAppWrapperFeature;

/** ****************************************************************************************/

/** **************** Observability Traces ****************/

interface ObservabilityFocusedTraceWaterfallFeature {
  id: 'observability-focused-trace-waterfall';
  render: (props: FocusedTraceWaterfallProps) => JSX.Element;
}

interface ObservabilityFullTraceWaterfallFeature {
  id: 'observability-full-trace-waterfall';
  render: (props: FullTraceWaterfallProps) => JSX.Element;
}

export interface ObservabilityTracesSpanLinksFeature {
  id: 'observability-traces-fetch-span-links';
  fetchSpanLinks: (
    params: {
      traceId: string;
      docId: string;
      start: string;
      end: string;
      processorEvent?: ProcessorEvent;
    },
    signal: AbortSignal
  ) => Promise<SpanLinks>;
}

export interface ObservabilityTracesFetchErrorsFeature {
  id: 'observability-traces-fetch-errors';
  fetchErrorsByTraceId: (
    params: {
      traceId: string;
      docId?: string;
      start: string;
      end: string;
    },
    signal: AbortSignal
  ) => Promise<ErrorsByTraceId>;
}

export interface ObservabilityTracesFetchRootSpanByTraceIdFeature {
  id: 'observability-traces-fetch-root-span-by-trace-id';
  fetchRootSpanByTraceId: (
    params: {
      traceId: string;
      start: string;
      end: string;
    },
    signal: AbortSignal
  ) => Promise<TraceRootSpan | undefined>;
}

export interface ObservabilityTracesFetchSpanFeature {
  id: 'observability-traces-fetch-span';
  fetchSpan: (
    params: {
      traceId: string;
      spanId: string;
      start: string;
      end: string;
    },
    signal: AbortSignal
  ) => Promise<UnifiedSpanDocument | undefined>;
}

export interface ObservabilityTracesFetchLatencyOverallTransactionDistributionFeature {
  id: 'observability-traces-fetch-latency-overall-transaction-distribution';
  fetchLatencyOverallTransactionDistribution: (
    params: {
      transactionName: string;
      transactionType: string;
      serviceName: string;
      start: string;
      end: string;
    },
    signal: AbortSignal
  ) => Promise<
    | {
        overallHistogram?: HistogramItem[];
        percentileThresholdValue?: number | null;
      }
    | undefined
  >;
}

export interface ObservabilityTracesFetchLatencyOverallSpanDistributionFeature {
  id: 'observability-traces-fetch-latency-overall-span-distribution';
  fetchLatencyOverallSpanDistribution: (
    params: {
      spanName: string;
      serviceName: string;
      start: string;
      end: string;
      isOtel: boolean;
    },
    signal: AbortSignal
  ) => Promise<
    | {
        overallHistogram?: HistogramItem[];
        percentileThresholdValue?: number | null;
      }
    | undefined
  >;
}

export type ObservabilityTracesFeature =
  | ObservabilityTracesSpanLinksFeature
  | ObservabilityTracesFetchErrorsFeature
  | ObservabilityTracesFetchRootSpanByTraceIdFeature
  | ObservabilityTracesFetchSpanFeature
  | ObservabilityTracesFetchLatencyOverallTransactionDistributionFeature
  | ObservabilityTracesFetchLatencyOverallSpanDistributionFeature
  | ObservabilityFocusedTraceWaterfallFeature
  | ObservabilityFullTraceWaterfallFeature;

/** ****************************************************************************************/

// This should be a union of all the available client features.
export type DiscoverFeature =
  | ObservabilityStreamsFeature
  | ObservabilityLogsAIAssistantFeature
  | ObservabilityLogsAIInsightFeature
  | ObservabilityCreateSLOFeature
  | ObservabilityLogEventsFeature
  | ObservabilityTracesFeature
  | ObservabilityLogsFetchDocumentByIdFeature
  | SecuritySolutionFeature;

/**
 * Service types
 */
export interface DiscoverFeaturesServiceSetup {
  registry: FeaturesRegistry<DiscoverFeature>;
}

export interface DiscoverFeaturesServiceStart {
  registry: FeaturesRegistry<DiscoverFeature>;
}
