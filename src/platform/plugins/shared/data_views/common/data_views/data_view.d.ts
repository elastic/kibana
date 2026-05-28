import type { estypes } from '@elastic/elasticsearch';
import type { FieldFormatsStartCommon } from '@kbn/field-formats-plugin/common';
import type { DataViewBase } from '@kbn/es-query';
import type { DataViewField, IIndexPatternFieldList } from '../fields';
import type { DataViewFieldMap, DataViewSpec, RuntimeField, FieldSpec } from '../types';
import { AbstractDataView } from './abstract_data_views';
interface DataViewDeps {
    spec?: DataViewSpec;
    fieldFormats: FieldFormatsStartCommon;
    shortDotsEnable?: boolean;
    metaFields?: string[];
}
/**
 * An interface representing a data view that is time based.
 */
export interface TimeBasedDataView extends DataView {
    /**
     * The timestamp field name.
     */
    timeFieldName: NonNullable<DataView['timeFieldName']>;
    /**
     * The timestamp field.
     */
    getTimeField: () => DataViewField;
}
/**
 * Data view class. Central kibana abstraction around multiple indices.
 */
export declare class DataView extends AbstractDataView implements DataViewBase {
    /**
     * Field list, in extended array format
     */
    fields: IIndexPatternFieldList & {
        toSpec: () => DataViewFieldMap;
    };
    /**
     * @deprecated Use `flattenHit` utility method exported from data plugin instead.
     */
    flattenHit: (hit: Record<string, unknown[]>, deep?: boolean) => Record<string, unknown>;
    private etag;
    /**
     * constructor
     * @param config - config data and dependencies
     */
    constructor(config: DataViewDeps);
    getScriptedFieldsForQuery(): Record<string, estypes.ScriptField>;
    getEtag: () => string | undefined;
    setEtag: (etag: string | undefined) => string | undefined;
    /**
     * Returns scripted fields
     */
    getComputedFields(): {
        scriptFields: Record<string, estypes.ScriptField>;
        docvalueFields: {
            field: string;
            format: string;
        }[];
        runtimeFields: estypes.MappingRuntimeFields;
    };
    /**
     * Creates static representation of the data view.
     * @param includeFields Whether or not to include the `fields` list as part of this spec. If not included, the list
     * will be fetched from Elasticsearch when instantiating a new Data View with this spec.
     */
    toSpec(includeFields?: boolean): DataViewSpec;
    /**
     * Creates a minimal static representation of the data view. Fields and popularity scores will be omitted.
     */
    toMinimalSpec(params?: {
        keepFieldAttrs?: Array<'customLabel' | 'customDescription'>;
    }): Omit<DataViewSpec, 'fields'>;
    /**
     * Removes scripted field from field list.
     * @param fieldName name of scripted field to remove
     * @deprecated use runtime field instead
     */
    removeScriptedField(fieldName: string): void;
    /**
     *
     * @deprecated Will be removed when scripted fields are removed.
     */
    getNonScriptedFields(): DataViewField[];
    /**
     *
     * @deprecated Use runtime field instead.
     */
    getScriptedFields(): DataViewField[];
    /**
     * returns true if dataview contains TSDB fields
     */
    isTSDBMode(): boolean;
    /**
     * Does the data view have a timestamp field?
     */
    isTimeBased(): this is TimeBasedDataView;
    /**
     * Does the data view have a timestamp field and is it a date nanos field?
     */
    isTimeNanosBased(): this is TimeBasedDataView;
    /**
     * Get timestamp field as DataViewField or return undefined
     */
    getTimeField(): DataViewField | undefined;
    /**
     * Get field by name.
     * @param name field name
     */
    getFieldByName(name: string): DataViewField | undefined;
    /**
     * Add a runtime field - Appended to existing mapped field or a new field is
     * created as appropriate.
     * @param name Field name
     * @param runtimeField Runtime field definition
     */
    addRuntimeField(name: string, runtimeField: RuntimeField): DataViewField[];
    /**
     * Returns data view fields backed by runtime fields.
     * @param name runtime field name
     * @returns map of DataViewFields (that are runtime fields) by field name
     */
    getFieldsByRuntimeFieldName(name: string): Record<string, DataViewField> | undefined;
    /**
     * Remove a runtime field - removed from mapped field or removed unmapped
     * field as appropriate. Doesn't clear associated field attributes.
     * @param name - Field name to remove
     */
    removeRuntimeField(name: string): void;
    /**
     * Return the "runtime_mappings" section of the ES search query.
     */
    getRuntimeMappings(): estypes.MappingRuntimeFields;
    /**
     * Set field custom label
     * @param fieldName name of field to set custom label on
     * @param customLabel custom label value. If undefined, custom label is removed
     */
    setFieldCustomLabel(fieldName: string, customLabel: string | undefined | null): void;
    /**
     * Set field custom description
     * @param fieldName name of field to set custom label on
     * @param customDescription custom description value. If undefined, custom description is removed
     */
    setFieldCustomDescription(fieldName: string, customDescription: string | undefined | null): void;
    /**
     * Set field count
     * @param fieldName name of field to set count on
     * @param count count value. If undefined, count is removed
     */
    setFieldCount(fieldName: string, count: number | undefined | null): void;
    /**
     * Add composite runtime field and all subfields.
     * @param name field name
     * @param runtimeField runtime field definition
     * @returns data view field instance
     */
    private addCompositeRuntimeField;
    private updateOrAddRuntimeField;
    upsertScriptedField: (field: FieldSpec) => void;
}
export {};
