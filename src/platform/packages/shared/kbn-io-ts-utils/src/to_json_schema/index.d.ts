import type * as t from 'io-ts';
import type { ParseableType } from '../parseable_types';
interface JSONSchemaObject {
    type: 'object';
    required?: string[];
    properties?: Record<string, JSONSchema>;
    additionalProperties?: boolean | JSONSchema;
}
interface JSONSchemaOneOf {
    oneOf: JSONSchema[];
}
interface JSONSchemaAllOf {
    allOf: JSONSchema[];
}
interface JSONSchemaAnyOf {
    anyOf: JSONSchema[];
}
interface JSONSchemaArray {
    type: 'array';
    items?: JSONSchema;
}
interface BaseJSONSchema {
    type: string;
}
type JSONSchema = JSONSchemaObject | JSONSchemaArray | BaseJSONSchema | JSONSchemaOneOf | JSONSchemaAllOf | JSONSchemaAnyOf;
export declare const toJsonSchema: (type: t.Type<any> | ParseableType) => JSONSchema;
export {};
