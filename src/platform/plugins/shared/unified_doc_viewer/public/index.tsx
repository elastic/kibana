/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { withSuspense } from '@kbn/shared-ux-utility';
import { EuiDelayRender, EuiSkeletonText } from '@elastic/eui';
import type { JsonCodeEditorProps } from './components';
import { UnifiedDocViewerPublicPlugin } from './plugin';

export type { UnifiedDocViewerSetup, UnifiedDocViewerStart } from './plugin';

const LazyJsonCodeEditor = React.lazy(
  () => import('./components/json_code_editor/json_code_editor')
);

export const JsonCodeEditor = withSuspense<JsonCodeEditorProps>(
  LazyJsonCodeEditor,
  <EuiDelayRender delay={300}>
    <EuiSkeletonText />
  </EuiDelayRender>
);

export { useEsDocSearch } from './hooks';
export { UnifiedDocViewer } from './components/lazy_doc_viewer';
export { UnifiedDocViewerFlyout } from './components/lazy_doc_viewer_flyout';

export type {
  LogsOverviewProps as UnifiedDocViewerLogsOverviewProps,
  LogsOverviewApi as UnifiedDocViewerLogsOverviewApi,
} from './components/doc_viewer_logs_overview/logs_overview';
export { UnifiedDocViewerLogsOverview } from './components/lazy_doc_viewer_logs_overview';

export { UnifiedDocViewerObservabilityTracesSpanOverview } from './components/observability/traces/doc_viewer_span_overview/lazy_doc_viewer_obs_traces_span_overview';
export { UnifiedDocViewerObservabilityTracesTransactionOverview } from './components/observability/traces/doc_viewer_transaction_overview/lazy_doc_viewer_obs_traces_transaction_overview';
export { UnifiedDocViewerObservabilityAttributesOverview } from './components/observability/attributes/doc_viewer_attributes_overview/lazy_doc_viewer_obs_attributes_overview';
export { LazyServiceNameColumn } from './components/observability/traces/components/service_name_column/lazy_service_name_column';

export const plugin = () => new UnifiedDocViewerPublicPlugin();
