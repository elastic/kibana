import type { FieldFormat, FieldFormatsStartCommon, SerializedFieldFormat } from '@kbn/field-formats-plugin/common';
import type { DataViewFieldBase } from '@kbn/es-query';
import type { DataViewSpec, FieldSpec, FieldFormatMap, RuntimeFieldSpec, SourceFilter, TypeMeta, RuntimeField } from '../types';
import type { DataViewAttributes, FieldAttrs, FieldAttrSet } from '..';
import type { DataViewField } from '../fields';
interface SavedObjectBody {
    fieldAttrs?: string;
    title?: string;
    timeFieldName?: string;
    fields?: string;
    sourceFilters?: string;
    fieldFormatMap?: string;
    typeMeta?: string;
    type?: string;
}
interface AbstractDataViewDeps {
    spec?: DataViewSpec;
    fieldFormats: FieldFormatsStartCommon;
    shortDotsEnable?: boolean;
    metaFields?: string[];
}
type DataViewFieldBaseSpecMap = Record<string, DataViewFieldBase>;
export declare abstract class AbstractDataView {
    /**
     * Saved object id
     */
    id?: string;
    /**
     * Title of data view
     * @deprecated use getIndexPattern instead
     */
    title: string;
    /**
     * Map of field formats by field name
     */
    fieldFormatMap: FieldFormatMap;
    /**
     * Only used by rollup indices, used by rollup specific endpoint to load field list.
     */
    typeMeta?: TypeMeta;
    /**
     * Timestamp field name
     */
    timeFieldName: string | undefined;
    /**
     * Type is used to identify rollup index patterns or ES|QL data views.
     */
    type: string | undefined;
    /**
     * List of meta fields by name
     */
    metaFields: string[];
    /**
     * SavedObject version
     */
    version: string | undefined;
    /**
     * Array of filters - hides fields in discover
     */
    sourceFilters?: SourceFilter[];
    /**
     * Array of namespace ids
     */
    namespaces: string[];
    /**
     * Original saved object body. Used to check for saved object changes.
     */
    protected originalSavedObjectBody: SavedObjectBody;
    /**
     * Returns true if short dot notation is enabled
     */
    protected shortDotsEnable: boolean;
    /**
     * FieldFormats service interface
     */
    protected fieldFormats: FieldFormatsStartCommon;
    /**
     * Map of field attributes by field name. Currently count and customLabel.
     */
    protected fieldAttrs: FieldAttrs;
    /**
     * Map of runtime field definitions by field name
     */
    protected runtimeFieldMap: Record<string, RuntimeFieldSpec>;
    /**
     * Prevents errors when index pattern exists before indices
     */
    readonly allowNoIndex: boolean;
    /**
     * Name of the data view. Human readable name used to differentiate data view.
     */
    name: string;
    matchedIndices: string[];
    /**
     * Whether the data view is managed by the application.
     */
    managed: boolean;
    protected scriptedFieldsMap: DataViewFieldBaseSpecMap;
    private allowHidden;
    constructor(config: AbstractDataViewDeps);
    getAllowHidden: () => boolean;
    setAllowHidden: (allowHidden: boolean) => boolean;
    /**
     * Get name of Data View
     */
    getName: () => string;
    /**
     * Get index pattern
     * @returns index pattern string
     */
    getIndexPattern: () => string;
    /**
     * Set index pattern
     * @param string index pattern string
     */
    setIndexPattern: (indexPattern: string) => void;
    /**
     * Get last saved saved object fields
     */
    getOriginalSavedObjectBody: () => {
        fieldAttrs?: string;
        title?: string;
        timeFieldName?: string;
        fields?: string;
        sourceFilters?: string;
        fieldFormatMap?: string;
        typeMeta?: string;
        type?: string;
    };
    /**
     * Reset last saved saved object fields. Used after saving.
     */
    resetOriginalSavedObjectBody: () => void;
    /**
     * Returns true if the data view is persisted, and false if the dataview is adhoc.
     */
    isPersisted(): boolean;
    /**
     * Get the source filtering configuration for that index.
     */
    getSourceFiltering(): {
        excludes: string[];
    };
    /**
     * Get aggregation restrictions. Rollup fields can only perform a subset of aggregations.
     */
    getAggregationRestrictions(): Record<string, import("..").AggregationRestrictions> | undefined;
    /**
     * Provide a field, get its formatter
     * @param field field to get formatter for
     */
    getFormatterForField(field: DataViewField | DataViewField['spec']): FieldFormat;
    /**
     * Get formatter for a given field name. Return undefined if none exists.
     * @param fieldname name of field to get formatter for
     */
    getFormatterForFieldNoDefault(fieldname: string): FieldFormat | undefined;
    /**
     * Set field attribute
     * @param fieldName name of field to set attribute on
     * @param attrName name of attribute to set
     * @param value value of attribute
     */
    protected setFieldAttrs<K extends keyof FieldAttrSet>(fieldName: string, attrName: K, value: FieldAttrSet[K]): void;
    /**
     * Set field custom label
     * @param fieldName name of field to set custom label on
     * @param customLabel custom label value. If undefined, custom label is removed
     */
    protected setFieldCustomLabelInternal(fieldName: string, customLabel: string | undefined | null): void;
    /**
     * Set field count
     * @param fieldName name of field to set count on
     * @param count count value. If undefined, count is removed
     */
    protected setFieldCountInternal(fieldName: string, count: number | undefined | null): void;
    /**
     * Set field custom description
     * @param fieldName name of field to set custom description on
     * @param customDescription custom description value. If undefined, custom description is removed
     */
    protected setFieldCustomDescriptionInternal(fieldName: string, customDescription: string | undefined | null): void;
    /**
     * Set field formatter
     * @param fieldName name of field to set format on
     * @param format field format in serialized form
     */
    readonly setFieldFormat: (fieldName: string, format: SerializedFieldFormat) => void;
    /**
     * Remove field format from the field format map.
     * @param fieldName field name associated with the format for removal
     */
    readonly deleteFieldFormat: (fieldName: string) => void;
    /**
     * Returns index pattern as saved object body for saving
     */
    getAsSavedObjectBody(): DataViewAttributes;
    protected toSpecShared(includeFields?: boolean): DataViewSpec;
    protected upsertScriptedFieldInternal: (field: FieldSpec) => void;
    protected deleteScriptedFieldInternal: (fieldName: string) => void;
    replaceAllScriptedFields(newFields: Record<string, FieldSpec>): void;
    removeScriptedField(name: string): void;
    upsertScriptedField(field: FieldSpec): void;
    /**
     * Only used by search source to process sorting of scripted fields
     * @param name field name
     * @returns DataViewFieldBase
     */
    getScriptedField(name: string): DataViewFieldBase | undefined;
    /**
     * Checks if runtime field exists
     * @param name field name
     */
    hasRuntimeField(name: string): boolean;
    /**
     * Returns runtime field if exists
     * @param name Runtime field name
     */
    getRuntimeField(name: string): RuntimeField | null;
    /**
     * Get all runtime field definitions.
     * NOTE: this does not strip out runtime fields that match mapped field names
     * @returns map of runtime field definitions by field name
     */
    getAllRuntimeFields(): Record<string, RuntimeField>;
    /**
     * Replaces all existing runtime fields with new fields.
     * @param newFields Map of runtime field definitions by field name
     */
    replaceAllRuntimeFields(newFields: Record<string, RuntimeField>): void;
    removeRuntimeField(name: string): void;
    addRuntimeField(name: string, runtimeField: RuntimeField): void;
    protected removeRuntimeFieldInteral(name: string): void;
    protected addRuntimeFieldInteral(name: string, runtimeField: RuntimeField): void;
    getFieldAttrs: () => Map<string, FieldAttrSet>;
    /**
     * Checks if there are any matched indices.
     * @returns True if there are matched indices, false otherwise.
     */
    hasMatchedIndices(): boolean;
}
export {};
