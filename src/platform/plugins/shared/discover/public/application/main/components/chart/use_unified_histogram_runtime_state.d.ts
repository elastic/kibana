export declare const useUnifiedHistogramRuntimeState: (localStorageKeyPrefix?: string) => {
    currentTabId: string;
    unifiedHistogramProps: Omit<import("@kbn/unified-histogram/services/state_service").UnifiedHistogramStateOptions, "services"> & {
        services: import("@kbn/unified-histogram").UnifiedHistogramServices;
        isChartLoading?: boolean;
        withDefaultActions?: import("@kbn/lens-common").LensRendererProps["withDefaultActions"];
        disabledActions?: import("@kbn/lens-common").LensEmbeddableInput["disabledActions"];
        onFilter?: import("@kbn/lens-common").LensEmbeddableInput["onFilter"];
        onBrushEnd?: import("@kbn/lens-common").LensEmbeddableInput["onBrushEnd"];
        onBreakdownFieldChange?: (breakdownField: string | undefined) => void;
        onTimeIntervalChange?: (timeInterval: string | undefined) => void;
        onVisContextChanged?: (nextVisContext: import("@kbn/unified-histogram").UnifiedHistogramVisContext | undefined, externalVisContextStatus: import("@kbn/unified-histogram").UnifiedHistogramExternalVisContextStatus) => void;
    } & {
        setUnifiedHistogramApi: (api: import("@kbn/unified-histogram").UnifiedHistogramApi) => void;
    };
};
