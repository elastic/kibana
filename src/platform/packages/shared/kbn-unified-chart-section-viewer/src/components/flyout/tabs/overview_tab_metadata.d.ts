import React from 'react';
import type { ParsedMetricItem } from '../../../types';
import { type MetricSourceKind } from '../hooks/use_metric_source_kind';
interface StaticIndexName {
    indexName: string;
    kind: MetricSourceKind;
}
export interface OverviewTabMetadataProps {
    metricItem: ParsedMetricItem;
    /**
     * When set, prepends a static `<Label>: <indexName>` row above the standard
     * metadata. The label is derived from `kind` (Index or Data stream). Used
     * when the index name is not rendered through the streams flyout.
     */
    staticIndexName?: StaticIndexName;
}
export declare const OverviewTabMetadata: ({ metricItem, staticIndexName }: OverviewTabMetadataProps) => React.JSX.Element;
export {};
