/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { dynamic } from '@kbn/shared-ux-utility';

export * from './common/logs';

export type {
  LogsOverviewApi as UnifiedDocViewerLogsOverviewApi,
  LogsOverviewProps as UnifiedDocViewerLogsOverviewProps,
} from './observability/components/doc_viewer_logs_overview/logs_overview';

export { UnifiedDocViewerLogsOverview } from './observability/components/lazy_doc_viewer_logs_overview';
export { UnifiedDocViewerObservabilityTracesOverview } from './observability/components/observability/traces/doc_viewer_overview/lazy_doc_viewer_obs_traces_overview';
export { UnifiedDocViewerObservabilityGenericOverview } from './observability/components/observability/generic/doc_viewer_overview/lazy_doc_viewer_obs_generic_overview';
export { UnifiedDocViewerObservabilityAttributesOverview } from './observability/components/observability/attributes/doc_viewer_attributes_overview/lazy_doc_viewer_obs_attributes_overview';

export { ContentFrameworkSection } from './observability/components/content_framework/lazy_content_framework_section';
export type { ContentFrameworkSectionProps } from './observability/components/content_framework/section/section';

export {
  UnifiedDocViewerServicesProvider,
  useUnifiedDocViewerServices,
} from './observability/services';
export type { UnifiedDocViewerContextualServices } from './observability/services';

export const LazySummaryColumn = dynamic(
  () => import('./common/logs/summary_column/summary_column')
);
