import type { UnifiedMetricsGridProps } from '../../../../../types';
type TraceMetricsContextProps = {
    indexes: string;
    filters: string[];
    metadataFields: string[];
    discoverFetch$: UnifiedMetricsGridProps['fetch$'];
    actions: UnifiedMetricsGridProps['actions'];
} & Pick<UnifiedMetricsGridProps, 'fetchParams' | 'services' | 'onBrushEnd' | 'onFilter' | 'profileId'>;
export declare const TraceMetricsContext: import("react").Context<TraceMetricsContextProps | undefined>;
export declare const TraceMetricsProvider: import("react").Provider<TraceMetricsContextProps | undefined>;
export declare const useTraceMetricsContext: () => TraceMetricsContextProps;
export {};
