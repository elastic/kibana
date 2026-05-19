import type { estypes } from '@elastic/elasticsearch';
import type { DataView, DataViewField } from '@kbn/data-views-plugin/common';
import type { FieldFormat } from '@kbn/field-formats-plugin/common';
type FieldHitValue = any;
export interface FieldValueCountsParams {
    values: FieldHitValue[];
    field: DataViewField;
    count?: number;
    isEsqlQuery: boolean;
}
export declare function getFieldExampleBuckets(params: FieldValueCountsParams, formatter?: FieldFormat): {
    buckets: Pick<{
        count: number;
        key: any;
        order: number;
    }, "count" | "key">[];
    sampledValues: number;
    sampledDocuments: number;
};
export declare function getFieldValues(hits: estypes.SearchHit[], field: DataViewField, dataView: DataView): FieldHitValue[];
export declare function groupValues(records: FieldHitValue[], formatter?: FieldFormat): {
    groups: Record<string, {
        count: number;
        key: any;
        order: number;
    }>;
    sampledValues: number;
};
export {};
