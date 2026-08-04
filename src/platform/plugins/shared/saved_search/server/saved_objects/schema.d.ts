import type { TypeOf } from '@kbn/config-schema';
import { DataGridDensity } from '@kbn/discover-utils';
import type { SavedObjectsModelVersionMap } from '@kbn/core-saved-objects-server';
import { VIEW_MODE } from '../../common';
export declare const SCHEMA_DISCOVER_SESSION_V13: import("@kbn/config-schema").ObjectType<{
    title: import("@kbn/config-schema").Type<string>;
    description: import("@kbn/config-schema").Type<string>;
    tabs: import("@kbn/config-schema").Type<Readonly<{} & {
        id: string;
        label: string;
        attributes: Readonly<{
            refreshInterval?: Readonly<{} & {
                pause: boolean;
                value: number;
            }> | undefined;
            timeRange?: Readonly<{} & {
                from: string;
                to: string;
            }> | undefined;
            viewMode?: VIEW_MODE | undefined;
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
    }>[]>;
}>;
export declare const DISCOVER_SESSION_MODEL_VERSIONS: SavedObjectsModelVersionMap;
export declare const SCHEMA_TAB_LATEST: import("@kbn/config-schema").ObjectType<{
    id: import("@kbn/config-schema").Type<string>;
    label: import("@kbn/config-schema").Type<string>;
    attributes: import("@kbn/config-schema").ObjectType<{
        hideChart: import("@kbn/config-schema").Type<boolean>;
        hideTable: import("@kbn/config-schema").Type<boolean>;
        columns: import("@kbn/config-schema").Type<string[]>;
        sort: import("@kbn/config-schema").Type<string[] | string[][]>;
        grid: import("@kbn/config-schema").ObjectType<{
            columns: import("@kbn/config-schema").Type<Record<string, Readonly<{
                width?: number | undefined;
            } & {}>> | undefined>;
        }>;
        headerRowHeight: import("@kbn/config-schema").Type<number | undefined>;
        rowHeight: import("@kbn/config-schema").Type<number | undefined>;
        rowsPerPage: import("@kbn/config-schema").Type<number | undefined>;
        sampleSize: import("@kbn/config-schema").Type<number | undefined>;
        density: import("@kbn/config-schema").Type<DataGridDensity | undefined>;
        breakdownField: import("@kbn/config-schema").Type<string | undefined>;
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
        chartInterval: import("@kbn/config-schema").Type<string | undefined>;
        kibanaSavedObjectMeta: import("@kbn/config-schema").ObjectType<{
            searchSourceJSON: import("@kbn/config-schema").Type<string>;
        }>;
        isTextBasedQuery: import("@kbn/config-schema").Type<boolean>;
        usesAdHocDataView: import("@kbn/config-schema").Type<boolean | undefined>;
        controlGroupJson: import("@kbn/config-schema").Type<string | undefined>;
        timeRestore: import("@kbn/config-schema").Type<boolean | undefined>;
        timeRange: import("@kbn/config-schema").Type<Readonly<{} & {
            from: string;
            to: string;
        }> | undefined>;
        refreshInterval: import("@kbn/config-schema").Type<Readonly<{} & {
            pause: boolean;
            value: number;
        }> | undefined>;
        viewMode: import("@kbn/config-schema").Type<VIEW_MODE | undefined>;
        hideAggregatedPreview: import("@kbn/config-schema").Type<boolean | undefined>;
    }>;
}>;
export declare const SCHEMA_DISCOVER_SESSION_LATEST: import("@kbn/config-schema").ObjectType<{
    title: import("@kbn/config-schema").Type<string>;
    description: import("@kbn/config-schema").Type<string>;
    tabs: import("@kbn/config-schema").Type<Readonly<{} & {
        id: string;
        label: string;
        attributes: Readonly<{
            refreshInterval?: Readonly<{} & {
                pause: boolean;
                value: number;
            }> | undefined;
            timeRange?: Readonly<{} & {
                from: string;
                to: string;
            }> | undefined;
            viewMode?: VIEW_MODE | undefined;
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
    }>[]>;
}>;
export type DiscoverSessionTabAttributes = TypeOf<typeof SCHEMA_TAB_LATEST>['attributes'];
export type DiscoverSessionTab = TypeOf<typeof SCHEMA_TAB_LATEST>;
export type DiscoverSessionAttributes = TypeOf<typeof SCHEMA_DISCOVER_SESSION_LATEST>;
