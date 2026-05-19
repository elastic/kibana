import type { ArrayUnsavedFieldChange, BooleanUnsavedFieldChange, ColorUnsavedFieldChange, ImageUnsavedFieldChange, JsonUnsavedFieldChange, MarkdownUnsavedFieldChange, NumberUnsavedFieldChange, SelectUnsavedFieldChange, StringUnsavedFieldChange, UndefinedUnsavedFieldChange, UnsavedFieldChange } from '@kbn/management-settings-types';
/** Simplifed type for a {@link UnsavedFieldChange} */
type Change = UnsavedFieldChange;
/**
 * Returns `true` if the given {@link FieldUnsavedChange} is an {@link ArrayUnsavedFieldChange},
 * `false` otherwise.
 * @param c The {@link FieldUnsavedChange} to check.
 */
export declare const isArrayFieldUnsavedChange: (c?: Change) => c is ArrayUnsavedFieldChange;
/**
 * Returns `true` if the given {@link FieldUnsavedChange} is an {@link BooleanUnsavedFieldChange},
 * `false` otherwise.
 * @param c The {@link FieldUnsavedChange} to check.
 */
export declare const isBooleanFieldUnsavedChange: (c?: Change) => c is BooleanUnsavedFieldChange;
/**
 * Returns `true` if the given {@link FieldUnsavedChange} is an {@link ColorUnsavedFieldChange},
 * `false` otherwise.
 * @param c The {@link FieldUnsavedChange} to check.
 */
export declare const isColorFieldUnsavedChange: (c?: Change) => c is ColorUnsavedFieldChange;
/**
 * Returns `true` if the given {@link FieldUnsavedChange} is an {@link ImageUnsavedFieldChange},
 * `false` otherwise.
 * @param c The {@link FieldUnsavedChange} to check.
 */
export declare const isImageFieldUnsavedChange: (c?: Change) => c is ImageUnsavedFieldChange;
/**
 * Returns `true` if the given {@link FieldUnsavedChange} is an {@link JsonUnsavedFieldChange},
 * `false` otherwise.
 * @param c The {@link FieldUnsavedChange} to check.
 */
export declare const isJsonFieldUnsavedChange: (c?: Change) => c is JsonUnsavedFieldChange;
/**
 * Returns `true` if the given {@link FieldUnsavedChange} is an {@link MarkdownUnsavedFieldChange},
 * `false` otherwise.
 * @param c The {@link FieldUnsavedChange} to check.
 */
export declare const isMarkdownFieldUnsavedChange: (c?: Change) => c is MarkdownUnsavedFieldChange;
/**
 * Returns `true` if the given {@link FieldUnsavedChange} is an {@link NumberUnsavedFieldChange},
 * `false` otherwise.
 * @param c The {@link FieldUnsavedChange} to check.
 */
export declare const isNumberFieldUnsavedChange: (c?: Change) => c is NumberUnsavedFieldChange;
/**
 * Returns `true` if the given {@link FieldUnsavedChange} is an {@link SelectUnsavedFieldChange},
 * `false` otherwise.
 * @param c The {@link FieldUnsavedChange} to check.
 */
export declare const isSelectFieldUnsavedChange: (c?: Change) => c is SelectUnsavedFieldChange;
/**
 * Returns `true` if the given {@link FieldUnsavedChange} is an {@link StringUnsavedFieldChange},
 * `false` otherwise.
 * @param c The {@link FieldUnsavedChange} to check.
 */
export declare const isStringFieldUnsavedChange: (c?: Change) => c is StringUnsavedFieldChange;
/**
 * Returns `true` if the given {@link FieldUnsavedChange} is an {@link UndefinedUnsavedFieldChange},
 * `false` otherwise.
 * @param c The {@link FieldUnsavedChange} to check.
 */
export declare const isUndefinedFieldUnsavedChange: (c?: Change) => c is UndefinedUnsavedFieldChange;
export {};
