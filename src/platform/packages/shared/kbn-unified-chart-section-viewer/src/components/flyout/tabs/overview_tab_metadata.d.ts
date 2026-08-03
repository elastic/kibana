import React from 'react';
import type { ParsedMetricItem } from '../../../types';
import { type MetricSourceKind } from '../hooks/use_metric_source_kind';
interface SourceLink {
    kind: MetricSourceKind;
    indexName: string;
    streamLink: React.ReactNode;
}
export interface OverviewTabMetadataProps {
    metricItem: ParsedMetricItem;
    /**
     * When set, prepends a `<Label>: <indexName>` row above the standard metadata.
     * The label is derived from `kind` (Index or Data stream) and the value is the index name or stream link.
     */
    indexRow?: SourceLink;
}
export declare const OverviewTabMetadata: ({ metricItem, indexRow }: OverviewTabMetadataProps) => React.JSX.Element;
export {};
