import { type CustomValidator, type Schema } from 'joi';
import type { SchemaTypeError } from '../errors';
import type { Reference } from '../references';
/**
 * Meta fields used when introspecting runtime validation. Most notably for
 * generating OpenAPI spec.
 */
export interface TypeMetaAvailability {
    /** @default stable */
    stability?: 'experimental' | 'beta' | 'stable';
    /**
     * The stack version in which this field was introduced (eg: 9.4.0).
     */
    since?: string;
}
export interface TypeMeta {
    /**
     * A unique identifier for this type, reduces duplication.
     */
    id?: string;
    /**
     * A human-friendly title for this type to be used in documentation.
     *
     * Defaults to the `id`, if provided.
     */
    title?: string;
    /**
     * A human-friendly description of this type to be used in documentation.
     */
    description?: string;
    /**
     * Whether this field is deprecated.
     */
    deprecated?: boolean;
    /**
     * Release version or date that this route will be removed
     * @example 9.0.0
     */
    'x-discontinued'?: string;
    /**
     * Availability metadata for this field to be used in generated API docs.
     */
    availability?: TypeMetaAvailability;
}
export interface TypeOptions<T> {
    defaultValue?: T | Reference<T> | (() => T);
    validate?: (value: T) => string | void;
    meta?: TypeMeta;
}
export interface SchemaStructureEntry {
    path: string[];
    type: string;
}
/**
 * Global validation Options to be provided when calling the `schema.validate()` method.
 */
export interface SchemaValidationOptions {
    /**
     * Remove unknown config keys
     */
    stripUnknownKeys?: boolean;
}
/**
 * Options for dealing with unknown keys:
 * - allow: unknown keys will be permitted
 * - ignore: unknown keys will not fail validation, but will be stripped out
 * - forbid (default): unknown keys will fail validation
 */
export type OptionsForUnknowns = 'allow' | 'ignore' | 'forbid';
export interface UnknownOptions {
    unknowns?: OptionsForUnknowns;
}
export interface ExtendsDeepOptions {
    unknowns?: OptionsForUnknowns;
}
export declare const convertValidationFunction: <T = unknown>(validate: (value: T) => string | void) => CustomValidator<T>;
export declare abstract class Type<V> {
    readonly type: V;
    readonly __isKbnConfigSchemaType = true;
    /**
     * Internal "schema" backed by Joi.
     * @type {Schema}
     */
    protected readonly internalSchema: Schema;
    protected constructor(schema: Schema, options?: TypeOptions<V>);
    extendsDeep(newOptions: ExtendsDeepOptions): Type<V>;
    /**
     * Validates the provided value against this schema.
     * If valid, the resulting output will be returned, otherwise an exception will be thrown.
     */
    validate(value: unknown, context?: Record<string, unknown>, namespace?: string, validationOptions?: SchemaValidationOptions): V;
    /**
     * @note intended for internal use, if you need to use this please contact
     *       the core team to discuss your use case.
     */
    getSchema(): Schema;
    getSchemaStructure(): SchemaStructureEntry[];
    protected handleError(type: string, context: Record<string, any>, path: string[]): string | SchemaTypeError | void;
    private onError;
}
