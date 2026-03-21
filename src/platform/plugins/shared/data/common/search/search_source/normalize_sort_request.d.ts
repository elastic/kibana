import type { estypes } from '@elastic/elasticsearch';
import type { DataView } from '@kbn/data-views-plugin/common';
import type { EsQuerySortValue } from './types';
type FieldSortOptions = estypes.FieldSort & estypes.ScoreSort & estypes.GeoDistanceSort & Omit<estypes.ScriptSort, 'script'> & {
    script?: estypes.ScriptSort['script'];
};
export declare function normalizeSortRequest(sortObject: EsQuerySortValue | EsQuerySortValue[], indexPattern: DataView | string | undefined, defaultSortOptions?: FieldSortOptions | string): ({
    _script: {
        order: import("./types").SortDirection;
        numeric_type?: "double" | "long" | "date" | "date_nanos";
        script: {
            source: string | undefined;
            lang: string | undefined;
        };
        type: string;
    } | {
        order: import("./types").SortDirection;
        format?: string;
        script: {
            source: string | undefined;
            lang: string | undefined;
        };
        type: string;
    };
} | {
    [x: string]: {
        missing?: estypes.AggregationsMissing;
        mode?: estypes.SortMode;
        nested?: estypes.NestedSortValue;
        order: estypes.SortOrder | import("./types").SortDirection;
        numeric_type?: estypes.FieldSortNumericType | undefined;
        format?: string;
        distance_type?: estypes.GeoDistanceType;
        ignore_unmapped?: boolean;
        unit?: estypes.DistanceUnit;
        type?: estypes.ScriptSortType | undefined;
        script?: estypes.ScriptSort["script"];
    } | {
        missing?: estypes.AggregationsMissing;
        mode?: estypes.SortMode;
        nested?: estypes.NestedSortValue;
        order: estypes.SortOrder | import("./types").SortDirection;
        numeric_type?: estypes.FieldSortNumericType;
        format?: string;
        distance_type?: estypes.GeoDistanceType;
        ignore_unmapped?: boolean;
        unit?: estypes.DistanceUnit;
        type?: estypes.ScriptSortType | undefined;
        script?: estypes.ScriptSort["script"];
    };
    _script?: undefined;
})[];
export {};
