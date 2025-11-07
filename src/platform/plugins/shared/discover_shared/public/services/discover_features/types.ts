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
import type { SpanLinks, ErrorsByTraceId } from '@kbn/apm-types';
import type { ProcessorEvent } from '@kbn/apm-types-shared';

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

export interface ObservabilityCreateSLOFeature {
  id: 'observability-create-slo';
  createSLOFlyout: (props: {
    onClose: () => void;
    initialValues: Record<string, unknown>;
  }) => React.ReactNode;
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

// This should be a union of all the available client features.
export type DiscoverFeature =
  | ObservabilityStreamsFeature
  | ObservabilityLogsAIAssistantFeature
  | ObservabilityCreateSLOFeature
  | ObservabilityLogEventsFeature
  | ObservabilityTracesSpanLinksFeature
  | ObservabilityTracesFetchErrorsFeature
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
