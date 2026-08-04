import type { DataViewField } from '@kbn/data-views-plugin/common';
export type FieldTypeKnown = Exclude<DataViewField['timeSeriesMetric'] | DataViewField['type'], undefined>;
export interface FieldBase {
    name: DataViewField['name'];
    type?: DataViewField['type'];
    displayName?: DataViewField['displayName'];
    customDescription?: DataViewField['customDescription'];
    count?: DataViewField['count'];
    timeSeriesMetric?: DataViewField['timeSeriesMetric'];
    esTypes?: DataViewField['esTypes'];
    scripted?: DataViewField['scripted'];
    isNull?: DataViewField['isNull'];
    conflictDescriptions?: Record<string, string[]>;
}
export type GetCustomFieldType<T extends FieldBase> = (field: T) => FieldTypeKnown;
