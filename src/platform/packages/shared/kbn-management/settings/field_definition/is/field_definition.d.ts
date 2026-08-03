import type { ArrayFieldDefinition, BooleanFieldDefinition, ColorFieldDefinition, FieldDefinition, ImageFieldDefinition, JsonFieldDefinition, MarkdownFieldDefinition, NumberFieldDefinition, SelectFieldDefinition, StringFieldDefinition, UndefinedFieldDefinition } from '@kbn/management-settings-types';
/** Simplifed type for a {@link FieldDefinition} */
type Definition = Pick<FieldDefinition, 'type'>;
/**
 * Returns `true` if the given {@link FieldDefinition} is an {@link ArrayFieldDefinition},
 * `false` otherwise.
 * @param d The {@link FieldDefinition} to check.
 */
export declare const isArrayFieldDefinition: (d: Definition) => d is ArrayFieldDefinition;
/**
 * Returns `true` if the given {@link FieldDefinition} is an {@link BooleanFieldDefinition},
 * `false` otherwise.
 * @param d The {@link FieldDefinition} to check.
 */
export declare const isBooleanFieldDefinition: (d: Definition) => d is BooleanFieldDefinition;
/**
 * Returns `true` if the given {@link FieldDefinition} is an {@link ColorFieldDefinition},
 * `false` otherwise.
 * @param d The {@link FieldDefinition} to check.
 */
export declare const isColorFieldDefinition: (d: Definition) => d is ColorFieldDefinition;
/**
 * Returns `true` if the given {@link FieldDefinition} is an {@link ImageFieldDefinition},
 * `false` otherwise.
 * @param d The {@link FieldDefinition} to check.
 */
export declare const isImageFieldDefinition: (d: Definition) => d is ImageFieldDefinition;
/**
 * Returns `true` if the given {@link FieldDefinition} is an {@link JsonFieldDefinition},
 * `false` otherwise.
 * @param d The {@link FieldDefinition} to check.
 */
export declare const isJsonFieldDefinition: (d: Definition) => d is JsonFieldDefinition;
/**
 * Returns `true` if the given {@link FieldDefinition} is an {@link MarkdownFieldDefinition},
 * `false` otherwise.
 * @param d The {@link FieldDefinition} to check.
 */
export declare const isMarkdownFieldDefinition: (d: Definition) => d is MarkdownFieldDefinition;
/**
 * Returns `true` if the given {@link FieldDefinition} is an {@link NumberFieldDefinition},
 * `false` otherwise.
 * @param d The {@link FieldDefinition} to check.
 */
export declare const isNumberFieldDefinition: (d: Definition) => d is NumberFieldDefinition;
/**
 * Returns `true` if the given {@link FieldDefinition} is an {@link SelectFieldDefinition},
 * `false` otherwise.
 * @param d The {@link FieldDefinition} to check.
 */
export declare const isSelectFieldDefinition: (d: Definition) => d is SelectFieldDefinition;
/**
 * Returns `true` if the given {@link FieldDefinition} is an {@link StringFieldDefinition},
 * `false` otherwise.
 * @param d The {@link FieldDefinition} to check.
 */
export declare const isStringFieldDefinition: (d: Definition) => d is StringFieldDefinition;
/**
 * Returns `true` if the given {@link FieldDefinition} is an {@link UndefinedFieldDefinition},
 * `false` otherwise.
 * @param d The {@link FieldDefinition} to check.
 */
export declare const isUndefinedFieldDefinition: (d: Definition) => d is UndefinedFieldDefinition;
export {};
