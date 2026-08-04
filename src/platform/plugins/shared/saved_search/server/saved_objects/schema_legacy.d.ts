import type { SavedObjectsModelVersionMap } from '@kbn/core-saved-objects-server';
import { DataGridDensity } from '@kbn/discover-utils';
import { VIEW_MODE } from '../../common';
export declare const SCHEMA_SEARCH_V8_8_0: import("@kbn/config-schema").ObjectType<{
    title: import("@kbn/config-schema").Type<string>;
    description: import("@kbn/config-schema").Type<string>;
    columns: import("@kbn/config-schema").Type<string[]>;
    sort: import("@kbn/config-schema").Type<string[] | string[][]>;
    grid: import("@kbn/config-schema").ObjectType<{
        columns: import("@kbn/config-schema").Type<Record<string, Readonly<{
            width?: number | undefined;
        } & {}>> | undefined>;
    }>;
    rowHeight: import("@kbn/config-schema").Type<number | undefined>;
    rowsPerPage: import("@kbn/config-schema").Type<number | undefined>;
    hideChart: import("@kbn/config-schema").Type<boolean>;
    breakdownField: import("@kbn/config-schema").Type<string | undefined>;
    kibanaSavedObjectMeta: import("@kbn/config-schema").ObjectType<{
        searchSourceJSON: import("@kbn/config-schema").Type<string>;
    }>;
    isTextBasedQuery: import("@kbn/config-schema").Type<boolean>;
    usesAdHocDataView: import("@kbn/config-schema").Type<boolean | undefined>;
    timeRestore: import("@kbn/config-schema").Type<boolean | undefined>;
    timeRange: import("@kbn/config-schema").Type<Readonly<{} & {
        from: string;
        to: string;
    }> | undefined>;
    refreshInterval: import("@kbn/config-schema").Type<Readonly<{} & {
        pause: boolean;
        value: number;
    }> | undefined>;
    viewMode: import("@kbn/config-schema").Type<VIEW_MODE.DOCUMENT_LEVEL | VIEW_MODE.AGGREGATED_LEVEL | undefined>;
    hideAggregatedPreview: import("@kbn/config-schema").Type<boolean | undefined>;
    hits: import("@kbn/config-schema").Type<number | undefined>;
    version: import("@kbn/config-schema").Type<number | undefined>;
}>;
export declare const SCHEMA_SEARCH_MODEL_VERSION_5: import("@kbn/config-schema").ObjectType<Omit<Omit<Omit<Omit<Omit<{
    title: import("@kbn/config-schema").Type<string>;
    description: import("@kbn/config-schema").Type<string>;
    columns: import("@kbn/config-schema").Type<string[]>;
    sort: import("@kbn/config-schema").Type<string[] | string[][]>;
    grid: import("@kbn/config-schema").ObjectType<{
        columns: import("@kbn/config-schema").Type<Record<string, Readonly<{
            width?: number | undefined;
        } & {}>> | undefined>;
    }>;
    rowHeight: import("@kbn/config-schema").Type<number | undefined>;
    rowsPerPage: import("@kbn/config-schema").Type<number | undefined>;
    hideChart: import("@kbn/config-schema").Type<boolean>;
    breakdownField: import("@kbn/config-schema").Type<string | undefined>;
    kibanaSavedObjectMeta: import("@kbn/config-schema").ObjectType<{
        searchSourceJSON: import("@kbn/config-schema").Type<string>;
    }>;
    isTextBasedQuery: import("@kbn/config-schema").Type<boolean>;
    usesAdHocDataView: import("@kbn/config-schema").Type<boolean | undefined>;
    timeRestore: import("@kbn/config-schema").Type<boolean | undefined>;
    timeRange: import("@kbn/config-schema").Type<Readonly<{} & {
        from: string;
        to: string;
    }> | undefined>;
    refreshInterval: import("@kbn/config-schema").Type<Readonly<{} & {
        pause: boolean;
        value: number;
    }> | undefined>;
    viewMode: import("@kbn/config-schema").Type<VIEW_MODE.DOCUMENT_LEVEL | VIEW_MODE.AGGREGATED_LEVEL | undefined>;
    hideAggregatedPreview: import("@kbn/config-schema").Type<boolean | undefined>;
    hits: import("@kbn/config-schema").Type<number | undefined>;
    version: import("@kbn/config-schema").Type<number | undefined>;
}, "sampleSize"> & {
    sampleSize: import("@kbn/config-schema").Type<number | undefined>;
}, "headerRowHeight"> & {
    headerRowHeight: import("@kbn/config-schema").Type<number | undefined>;
}, "visContext"> & {
    visContext: import("@kbn/config-schema").Type<Readonly<{} & {
        attributes: Record<string, any>;
        suggestionType: string;
        requestData: Readonly<{
            timeField?: string | undefined;
            dataViewId?: string | undefined;
            breakdownField?: string | undefined;
            timeInterval?: string | undefined;
        } & {}>;
    }> | Readonly<{} & {}> | undefined>;
}, "viewMode"> & {
    viewMode: import("@kbn/config-schema").Type<VIEW_MODE | undefined>;
}, "density"> & {
    density: import("@kbn/config-schema").Type<DataGridDensity | undefined>;
}>;
export declare const SCHEMA_SEARCH_MODEL_VERSION_6: import("@kbn/config-schema").ObjectType<Omit<Omit<Omit<Omit<Omit<Omit<{
    title: import("@kbn/config-schema").Type<string>;
    description: import("@kbn/config-schema").Type<string>;
    columns: import("@kbn/config-schema").Type<string[]>;
    sort: import("@kbn/config-schema").Type<string[] | string[][]>;
    grid: import("@kbn/config-schema").ObjectType<{
        columns: import("@kbn/config-schema").Type<Record<string, Readonly<{
            width?: number | undefined;
        } & {}>> | undefined>;
    }>;
    rowHeight: import("@kbn/config-schema").Type<number | undefined>;
    rowsPerPage: import("@kbn/config-schema").Type<number | undefined>;
    hideChart: import("@kbn/config-schema").Type<boolean>;
    breakdownField: import("@kbn/config-schema").Type<string | undefined>;
    kibanaSavedObjectMeta: import("@kbn/config-schema").ObjectType<{
        searchSourceJSON: import("@kbn/config-schema").Type<string>;
    }>;
    isTextBasedQuery: import("@kbn/config-schema").Type<boolean>;
    usesAdHocDataView: import("@kbn/config-schema").Type<boolean | undefined>;
    timeRestore: import("@kbn/config-schema").Type<boolean | undefined>;
    timeRange: import("@kbn/config-schema").Type<Readonly<{} & {
        from: string;
        to: string;
    }> | undefined>;
    refreshInterval: import("@kbn/config-schema").Type<Readonly<{} & {
        pause: boolean;
        value: number;
    }> | undefined>;
    viewMode: import("@kbn/config-schema").Type<VIEW_MODE.DOCUMENT_LEVEL | VIEW_MODE.AGGREGATED_LEVEL | undefined>;
    hideAggregatedPreview: import("@kbn/config-schema").Type<boolean | undefined>;
    hits: import("@kbn/config-schema").Type<number | undefined>;
    version: import("@kbn/config-schema").Type<number | undefined>;
}, "sampleSize"> & {
    sampleSize: import("@kbn/config-schema").Type<number | undefined>;
}, "headerRowHeight"> & {
    headerRowHeight: import("@kbn/config-schema").Type<number | undefined>;
}, "visContext"> & {
    visContext: import("@kbn/config-schema").Type<Readonly<{} & {
        attributes: Record<string, any>;
        suggestionType: string;
        requestData: Readonly<{
            timeField?: string | undefined;
            dataViewId?: string | undefined;
            breakdownField?: string | undefined;
            timeInterval?: string | undefined;
        } & {}>;
    }> | Readonly<{} & {}> | undefined>;
}, "viewMode"> & {
    viewMode: import("@kbn/config-schema").Type<VIEW_MODE | undefined>;
}, "density"> & {
    density: import("@kbn/config-schema").Type<DataGridDensity | undefined>;
}, "tabs"> & {
    tabs: import("@kbn/config-schema").Type<Readonly<{} & {
        id: string;
        label: string;
        attributes: Readonly<{
            refreshInterval?: Readonly<{} & {
                pause: boolean;
                value: number;
            }> | undefined;
            version?: number | undefined;
            timeRange?: Readonly<{} & {
                from: string;
                to: string;
            }> | undefined;
            viewMode?: VIEW_MODE | undefined;
            hits?: number | undefined;
            rowHeight?: number | undefined;
            density?: DataGridDensity | undefined;
            headerRowHeight?: number | undefined;
            sampleSize?: number | undefined;
            rowsPerPage?: number | undefined;
            breakdownField?: string | undefined;
            usesAdHocDataView?: boolean | undefined;
            timeRestore?: boolean | undefined;
            hideAggregatedPreview?: boolean | undefined;
            visContext?: Readonly<{} & {
                attributes: Record<string, any>;
                suggestionType: string;
                requestData: Readonly<{
                    timeField?: string | undefined;
                    dataViewId?: string | undefined;
                    breakdownField?: string | undefined;
                    timeInterval?: string | undefined;
                } & {}>;
            }> | Readonly<{} & {}> | undefined;
        } & {
            sort: string[] | string[][];
            grid: Readonly<{
                columns?: Record<string, Readonly<{
                    width?: number | undefined;
                } & {}>> | undefined;
            } & {}>;
            columns: string[];
            hideChart: boolean;
            kibanaSavedObjectMeta: Readonly<{} & {
                searchSourceJSON: string;
            }>;
            isTextBasedQuery: boolean;
        }>;
    }>[] | undefined>;
}>;
export declare const SCHEMA_SEARCH_MODEL_VERSION_12_SO_API_WORKAROUND: import("@kbn/config-schema").ObjectType<{
    tabs: import("@kbn/config-schema").Type<Readonly<{} & {
        id: string;
        label: string;
        attributes: Readonly<{
            refreshInterval?: Readonly<{} & {
                pause: boolean;
                value: number;
            }> | undefined;
            version?: number | undefined;
            timeRange?: Readonly<{} & {
                from: string;
                to: string;
            }> | undefined;
            viewMode?: VIEW_MODE | undefined;
            hits?: number | undefined;
            rowHeight?: number | undefined;
            density?: DataGridDensity | undefined;
            headerRowHeight?: number | undefined;
            sampleSize?: number | undefined;
            rowsPerPage?: number | undefined;
            breakdownField?: string | undefined;
            usesAdHocDataView?: boolean | undefined;
            timeRestore?: boolean | undefined;
            hideAggregatedPreview?: boolean | undefined;
            visContext?: Readonly<{} & {
                attributes: Record<string, any>;
                suggestionType: string;
                requestData: Readonly<{
                    timeField?: string | undefined;
                    dataViewId?: string | undefined;
                    breakdownField?: string | undefined;
                    timeInterval?: string | undefined;
                } & {}>;
            }> | Readonly<{} & {}> | undefined;
            controlGroupJson?: string | undefined;
            chartInterval?: string | undefined;
        } & {
            sort: string[] | string[][];
            grid: Readonly<{
                columns?: Record<string, Readonly<{
                    width?: number | undefined;
                } & {}>> | undefined;
            } & {}>;
            columns: string[];
            hideChart: boolean;
            kibanaSavedObjectMeta: Readonly<{} & {
                searchSourceJSON: string;
            }>;
            isTextBasedQuery: boolean;
            hideTable: boolean;
        }>;
    }>[] | undefined>;
    sort: import("@kbn/config-schema").Type<string[] | string[][] | undefined>;
    description: import("@kbn/config-schema").Type<string>;
    title: import("@kbn/config-schema").Type<string>;
    refreshInterval: import("@kbn/config-schema").Type<Readonly<{} & {
        pause: boolean;
        value: number;
    }> | undefined>;
    version: import("@kbn/config-schema").Type<number | undefined>;
    timeRange: import("@kbn/config-schema").Type<Readonly<{} & {
        from: string;
        to: string;
    }> | undefined>;
    viewMode: import("@kbn/config-schema").Type<VIEW_MODE | undefined>;
    grid: import("@kbn/config-schema").Type<Readonly<{
        columns?: Record<string, Readonly<{
            width?: number | undefined;
        } & {}>> | undefined;
    } & {}> | undefined>;
    hits: import("@kbn/config-schema").Type<number | undefined>;
    columns: import("@kbn/config-schema").Type<string[] | undefined>;
    rowHeight: import("@kbn/config-schema").Type<number | undefined>;
    density: import("@kbn/config-schema").Type<DataGridDensity | undefined>;
    headerRowHeight: import("@kbn/config-schema").Type<number | undefined>;
    sampleSize: import("@kbn/config-schema").Type<number | undefined>;
    rowsPerPage: import("@kbn/config-schema").Type<number | undefined>;
    hideChart: import("@kbn/config-schema").Type<boolean | undefined>;
    breakdownField: import("@kbn/config-schema").Type<string | undefined>;
    kibanaSavedObjectMeta: import("@kbn/config-schema").Type<Readonly<{} & {
        searchSourceJSON: string;
    }> | undefined>;
    isTextBasedQuery: import("@kbn/config-schema").Type<boolean | undefined>;
    usesAdHocDataView: import("@kbn/config-schema").Type<boolean | undefined>;
    timeRestore: import("@kbn/config-schema").Type<boolean | undefined>;
    hideAggregatedPreview: import("@kbn/config-schema").Type<boolean | undefined>;
    visContext: import("@kbn/config-schema").Type<Readonly<{} & {
        attributes: Record<string, any>;
        suggestionType: string;
        requestData: Readonly<{
            timeField?: string | undefined;
            dataViewId?: string | undefined;
            breakdownField?: string | undefined;
            timeInterval?: string | undefined;
        } & {}>;
    }> | Readonly<{} & {}> | undefined>;
    controlGroupJson: import("@kbn/config-schema").Type<string | undefined>;
    chartInterval: import("@kbn/config-schema").Type<string | undefined>;
    hideTable: import("@kbn/config-schema").Type<boolean | undefined>;
}>;
export declare const LEGACY_MODEL_REMOVED_ATTRIBUTES: string[];
export declare const LEGACY_MODEL_VERSIONS: SavedObjectsModelVersionMap;
