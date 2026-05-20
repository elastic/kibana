import { DataViewField } from '@kbn/data-views-plugin/common';
import type { IAggConfig } from '../agg_config';
import { BaseParamType } from './base';
import { KBN_FIELD_TYPES } from '../../../kbn_field_types/types';
export type FieldTypes = KBN_FIELD_TYPES | KBN_FIELD_TYPES[] | '*';
export type FilterFieldFn = (field: DataViewField) => boolean;
export type IFieldParamType = FieldParamType;
export declare class FieldParamType extends BaseParamType {
    required: boolean;
    scriptable: boolean;
    filterFieldTypes: FieldTypes;
    onlyAggregatable: boolean;
    /**
     * Filter available fields by passing filter fn on a {@link DataViewField}
     * If used, takes precedence over filterFieldTypes and other filter params
     */
    filterField?: FilterFieldFn;
    constructor(config: Record<string, any>);
    /**
     * filter the fields to the available ones
     */
    getAvailableFields: (aggConfig: IAggConfig) => DataViewField[];
}
