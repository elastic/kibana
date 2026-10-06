import type { RUNTIME_FIELD_TYPES } from '@kbn/as-code-data-views-schema';
import type { SerializedFieldFormat } from '@kbn/field-formats-plugin/common';
/**
 * Runtime field types
 */
export type RuntimeType = (typeof RUNTIME_FIELD_TYPES)[number];
/**
 * Runtime field primitive types - excluding composite
 */
export type RuntimePrimitiveTypes = Exclude<RuntimeType, 'composite'>;
/**
 * Runtime field definition
 * @public
 */
export type RuntimeFieldBase = {
    /**
     * Type of runtime field
     */
    type: RuntimeType;
    /**
     * Runtime field script
     */
    script?: {
        /**
         * Script source
         */
        source: string;
    };
};
/**
 * The RuntimeField that will be sent in the ES Query "runtime_mappings" object
 */
export type RuntimeFieldSpec = RuntimeFieldBase & {
    /**
     * Composite subfields
     */
    fields?: Record<string, {
        type: RuntimePrimitiveTypes;
    }>;
};
/**
 * Field attributes that are user configurable
 * @public
 */
export interface FieldConfiguration {
    /**
     * Field format in serialized form
     */
    format?: SerializedFieldFormat | null;
    /**
     * Custom label
     */
    customLabel?: string;
    /**
     * Custom description
     */
    customDescription?: string;
    /**
     * Popularity - used for discover
     */
    popularity?: number;
}
/**
 * This is the RuntimeField interface enhanced with Data view field
 * configuration: field format definition, customLabel or popularity.
 * @public
 */
export interface RuntimeField extends RuntimeFieldBase, FieldConfiguration {
    /**
     * Subfields of composite field
     */
    fields?: RuntimeFieldSubFields;
}
export type RuntimeFieldSubFields = Record<string, RuntimeFieldSubField>;
/**
 * Runtime field composite subfield
 * @public
 */
export interface RuntimeFieldSubField extends FieldConfiguration {
    type: RuntimePrimitiveTypes;
}
