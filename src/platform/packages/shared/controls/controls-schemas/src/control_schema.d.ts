import { type Type } from '@kbn/config-schema';
import { ControlValuesSource } from '@kbn/controls-constants';
export declare const controlTitleSchema: import("@kbn/config-schema").ObjectType<{
    title: Type<string | undefined>;
}>;
/**
 * This uses a oneOf with only one option so we can provide a default value for backwards compat
 */
export declare const dataControlFieldValuesSourceSchema: Type<ControlValuesSource.FIELD>;
export declare const dataControlFieldVariantProps: {
    values_source: Type<ControlValuesSource.FIELD>;
    data_view_id: Type<string>;
    field_name: Type<string>;
    use_global_filters: Type<boolean>;
    ignore_validations: Type<boolean>;
    title: Type<string | undefined>;
};
export declare const dataControlEsqlVariantProps: {
    values_source: Type<ControlValuesSource.ESQL>;
    esql_query: Type<string>;
    use_global_filters: Type<boolean>;
    ignore_validations: Type<boolean>;
    title: Type<string | undefined>;
};
export declare const dataControlSchema: Type<import("@kbn/config-schema/src/types").ObjectResultUnionType<{
    values_source: Type<ControlValuesSource.FIELD>;
    data_view_id: Type<string>;
    field_name: Type<string>;
    use_global_filters: Type<boolean>;
    ignore_validations: Type<boolean>;
    title: Type<string | undefined>;
} | {
    values_source: Type<ControlValuesSource.ESQL>;
    esql_query: Type<string>;
    use_global_filters: Type<boolean>;
    ignore_validations: Type<boolean>;
    title: Type<string | undefined>;
}>>;
