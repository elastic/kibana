import type { TraceDocumentOverview } from '@kbn/discover-utils';
import type { ContentFrameworkTableProps } from '../../../../content_framework';
export declare const getSharedFieldConfigurations: (flattenedHit: TraceDocumentOverview) => ContentFrameworkTableProps["fieldConfigurations"];
export declare const getSpanFieldConfigurations: (flattenedHit: TraceDocumentOverview) => ContentFrameworkTableProps["fieldConfigurations"];
export declare const getTransactionFieldConfigurations: (flattenedHit: TraceDocumentOverview) => ContentFrameworkTableProps["fieldConfigurations"];
