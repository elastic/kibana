import type { DataView } from '@kbn/data-views-plugin/common';
import type { AggregateQuery, Filter, Query, TimeRange } from '@kbn/es-query';
import type { Suggestion } from '@kbn/lens-common';
import type { DatatableColumn } from '@kbn/expressions-plugin/common';
import type { UnifiedHistogramVisContext } from '../types';
export declare const TIMESTAMP_COLUMN = "timestamp";
export interface QueryParams {
    dataView: DataView;
    query?: Query | AggregateQuery;
    filters: Filter[] | undefined;
    isPlainRecord?: boolean;
    columns?: DatatableColumn[];
    columnsMap?: Record<string, DatatableColumn>;
    timeRange?: TimeRange;
}
export declare const exportVisContext: (visContext: UnifiedHistogramVisContext | undefined) => UnifiedHistogramVisContext | undefined;
export declare function canImportVisContext(visContext: unknown | undefined): visContext is UnifiedHistogramVisContext;
export declare const isSuggestionShapeAndVisContextCompatible: (suggestion: Suggestion | undefined, externalVisContext: UnifiedHistogramVisContext | undefined) => boolean;
export declare const injectESQLQueryIntoLensLayers: (visAttributes: UnifiedHistogramVisContext["attributes"], query: AggregateQuery, dateFieldLabel?: string) => {
    version?: import("@kbn/lens-common/content_management/constants").LENS_ITEM_LATEST_VERSION | undefined;
    description?: string | undefined;
    title: string;
    references: import("@kbn/content-management-utils").Reference[];
    visualizationType: string;
    state: {
        filters: Filter[];
        query: Query | AggregateQuery;
        adHocDataViews?: Record<string, import("@kbn/data-views-plugin/common").DataViewSpec> | undefined;
        globalPalette?: {
            activePaletteId: string;
            state?: unknown;
        } | undefined;
        needsRefresh?: boolean | undefined;
        internalReferences?: import("@kbn/content-management-utils").Reference[] | undefined;
        datasourceStates: {
            formBased?: import("@kbn/lens-common").FormBasedPersistedState;
            textBased?: import("@kbn/lens-common").TextBasedPersistedState;
        };
        visualization: unknown;
    };
};
export declare function deriveLensSuggestionFromLensAttributes({ externalVisContext, queryParams, }: {
    externalVisContext: UnifiedHistogramVisContext | undefined;
    queryParams: QueryParams | null;
}): Suggestion | undefined;
