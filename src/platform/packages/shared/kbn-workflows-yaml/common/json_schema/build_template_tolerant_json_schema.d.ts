/**
 * A JSON value. JSON Schema documents are traversed structurally, so we model
 * them as plain JSON rather than importing a validator-specific type.
 */
export type JsonValue = string | number | boolean | null | JsonValue[] | JsonObject;
export interface JsonObject {
    [key: string]: JsonValue;
}
/**
 * Name of the shared definition holding the template-string alternatives. Every
 * templated position references this one definition (via `$ref`) instead of
 * repeating the branches, keeping the produced schema small.
 */
export declare const TEMPLATE_VALUE_DEF_NAME = "__workflowTemplateValue";
/**
 * JSON Schema `pattern` values are ECMA-262 regexes, and many validators (ajv
 * with `unicodeRegExp: true`, monaco-yaml) compile them with the unicode (`u`)
 * flag, under which identity escapes of non-syntax characters (e.g. `\%`) are a
 * SyntaxError. `@kbn/workflows-yaml` builds its regexes without the `u` flag, so
 * a source may contain `\%`. `\%` and `%` match identically, so we drop the
 * redundant backslash to keep the emitted pattern portable while preserving the
 * exact matching semantics.
 */
export declare const toUnicodeSafePattern: (source: string) => string;
/**
 * Anchor a pattern so it matches a value *as a whole*. JSON Schema `pattern` is
 * an unanchored (substring) match, so an un-anchored source would accept
 * template noise embedded in an otherwise concrete value (e.g. `5 {{ x }} junk`
 * in a `number` position). Strips an existing leading `^` / trailing `$` first
 * so an already-anchored source is not double-anchored.
 */
export declare const anchorWholeValue: (source: string) => string;
/**
 * Build a whole-value string alternative from a regex source: the source is made
 * unicode-safe and anchored so it accepts the value only when it is the template
 * as a whole. Exported so callers (e.g. the schema CLI) can contribute extra
 * whole-value alternatives such as install placeholders while staying consistent
 * with the built-in liquid alternatives.
 */
export declare const wholeValueStringAlternative: (regexSource: string) => JsonObject;
export interface BuildTemplateTolerantJsonSchemaOptions {
    /**
     * Extra whole-value string alternatives to add to the shared template-value
     * definition (in addition to the built-in liquid alternatives). Regex-agnostic:
     * callers supply ready-made `{ type: 'string', pattern }` objects, e.g. via
     * `wholeValueStringAlternative(source)`.
     */
    extraAlternatives?: JsonObject[];
}
/**
 * Return a copy of `schema` with template tolerance woven into every typed value
 * position that would otherwise reject a bare template string. The alternatives
 * are declared once in a shared `#/<defs>/__workflowTemplateValue` definition and
 * referenced with a single `$ref` at each wrapped position. The input is never
 * mutated; the root document is never wrapped.
 */
export declare const buildTemplateTolerantJsonSchema: (schema: JsonObject, options?: BuildTemplateTolerantJsonSchemaOptions) => JsonObject;
