import type { ES_FIELD_TYPES, KBN_FIELD_TYPES } from '@kbn/field-types';
import type { FieldFormatsGetConfigFn, FieldFormatConfig, FieldFormatInstanceType, FieldFormatId, FieldFormatMetaParams, FormatFactory, FieldFormatParams } from './types';
import type { FieldFormat } from './field_format';
export declare class FieldFormatsRegistry {
    protected fieldFormats: Map<FieldFormatId, FieldFormatInstanceType>;
    protected defaultMap: Record<string, FieldFormatConfig>;
    protected metaParamsOptions: FieldFormatMetaParams;
    protected getConfig?: FieldFormatsGetConfigFn;
    deserialize: FormatFactory;
    init(getConfig: FieldFormatsGetConfigFn, metaParamsOptions?: FieldFormatMetaParams, defaultFieldConverters?: FieldFormatInstanceType[]): void;
    /**
     * Get the id of the default type for this field type
     * using the format:defaultTypeMap config map
     *
     * @param  {KBN_FIELD_TYPES} fieldType - the field type
     * @param  {ES_FIELD_TYPES[]} esTypes - Array of ES data types
     * @return {FieldFormatConfig}
     */
    getDefaultConfig: (fieldType: KBN_FIELD_TYPES, esTypes?: ES_FIELD_TYPES[]) => FieldFormatConfig;
    /**
     * Get a derived FieldFormat class by its id.
     *
     * @param  {FieldFormatId} formatId - the format id
     * @return {FieldFormatInstanceType | undefined}
     */
    getType: (formatId: FieldFormatId) => FieldFormatInstanceType | undefined;
    getTypeWithoutMetaParams: (formatId: FieldFormatId) => FieldFormatInstanceType | undefined;
    /**
     * Get the default FieldFormat type (class) for
     * a field type, using the format:defaultTypeMap.
     * used by the field editor
     *
     * @param  {KBN_FIELD_TYPES} fieldType
     * @param  {ES_FIELD_TYPES[]} esTypes - Array of ES data types
     * @return {FieldFormatInstanceType | undefined}
     */
    getDefaultType: (fieldType: KBN_FIELD_TYPES, esTypes?: ES_FIELD_TYPES[]) => FieldFormatInstanceType | undefined;
    /**
     * Get the name of the default type for ES types like date_nanos
     * using the format:defaultTypeMap config map
     *
     * @param  {ES_FIELD_TYPES[]} esTypes - Array of ES data types
     * @return {ES_FIELD_TYPES | undefined}
     */
    getTypeNameByEsTypes: (esTypes: ES_FIELD_TYPES[] | undefined) => ES_FIELD_TYPES | undefined;
    /**
     * Get the default FieldFormat type name for
     * a field type, using the format:defaultTypeMap.
     *
     * @param  {KBN_FIELD_TYPES} fieldType
     * @param  {ES_FIELD_TYPES[]} esTypes
     * @return {ES_FIELD_TYPES | KBN_FIELD_TYPES}
     */
    getDefaultTypeName: (fieldType: KBN_FIELD_TYPES, esTypes?: ES_FIELD_TYPES[]) => ES_FIELD_TYPES | KBN_FIELD_TYPES;
    /**
     * Get the singleton instance of the FieldFormat type by its id.
     *
     * @param  {FieldFormatId} formatId
     * @return {FieldFormat}
     */
    getInstance: (formatId: FieldFormatId, params?: FieldFormatParams) => FieldFormat;
    private getInstanceMemoized;
    /**
     * Get the default fieldFormat instance for a field format.
     *
     * @param  {KBN_FIELD_TYPES} fieldType
     * @param  {ES_FIELD_TYPES[]} esTypes
     * @return {FieldFormat}
     */
    getDefaultInstancePlain: (fieldType: KBN_FIELD_TYPES, esTypes?: ES_FIELD_TYPES[], params?: FieldFormatParams) => FieldFormat;
    /**
     * Returns a cache key built by the given variables for caching in memoized
     * Where esType contains fieldType, fieldType is returned
     * -> kibana types have a higher priority in that case
     * -> would lead to failing tests that match e.g. date format with/without esTypes
     * https://lodash.com/docs#memoize
     *
     * @param  {KBN_FIELD_TYPES} fieldType
     * @param  {ES_FIELD_TYPES[] | undefined} esTypes
     * @return {String}
     */
    getDefaultInstanceCacheResolver(fieldType: KBN_FIELD_TYPES, esTypes?: ES_FIELD_TYPES[]): string;
    /**
     * Get filtered list of field formats by format type,
     * Skips hidden field formats
     *
     * @param  {KBN_FIELD_TYPES} fieldType
     * @return {FieldFormatInstanceType[]}
     */
    getByFieldType(fieldType: KBN_FIELD_TYPES): FieldFormatInstanceType[];
    /**
     * Get the default fieldFormat instance for a field format.
     * It's a memoized function that builds and reads a cache
     *
     * @param  {KBN_FIELD_TYPES} fieldType
     * @param  {ES_FIELD_TYPES[]} esTypes
     * @param  {FieldFormatParams} params
     * @return {FieldFormat}
     */
    getDefaultInstance: (fieldType: KBN_FIELD_TYPES, esTypes?: ES_FIELD_TYPES[], params?: FieldFormatParams) => FieldFormat;
    private getDefaultInstanceMemoized;
    parseDefaultTypeMap(value: Record<string, FieldFormatConfig>): void;
    register(fieldFormats: FieldFormatInstanceType[]): void;
    /**
     * Checks if field format with id already registered
     * @param id
     */
    has(id: string): boolean;
    /**
     * FieldFormat decorator - provide a one way to add meta-params for all field formatters
     *
     * @internal
     * @param  {FieldFormatInstanceType} fieldFormat - field format type
     * @return {FieldFormatInstanceType | undefined}
     */
    private fieldFormatMetaParamsDecorator;
    /**
     * Build Meta Params
     *
     * @param  {FieldFormatParams} custom params
     * @return {FieldFormatParams & FieldFormatMetaParams}
     */
    private buildMetaParams;
}
