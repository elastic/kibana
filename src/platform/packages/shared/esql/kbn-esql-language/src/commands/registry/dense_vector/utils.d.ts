import type { ESQLAstDenseVectorCommand, ESQLAstField, ESQLColumn, ESQLIdentifier } from '@elastic/esql/types';
/**
 * The keyword accepted by the `suffix = "..." ON ...` modifier. The grammar accepts any
 * identifier there, so callers must check it against this value — Elasticsearch rejects
 * anything else.
 */
export declare const DENSE_VECTOR_SUFFIX_KEYWORD = "suffix";
/** Suffix applied to the generated columns when `suffix = "..."` is not specified. */
export declare const DENSE_VECTOR_DEFAULT_SUFFIX = "_dense_vector";
export declare enum CaretPosition {
    FIELD_LIST = 0,// After DENSE_VECTOR: the field list, optionally opened by `target =`
    SUFFIX_ON_FIELD_LIST = 1,// After `suffix = "..." ON`: the field list
    AFTER_WITH_KEYWORD = 2,// After WITH but before the opening brace: suggest the map opener
    WITHIN_MAP_EXPRESSION = 3,// Within WITH { ... }: suggest map parameters
    AFTER_COMMAND = 4
}
/**
 * The command has three surface forms, which the parser disambiguates for us:
 *
 * - `DENSE_VECTOR f1, f2`                   → `fields`
 * - `DENSE_VECTOR target = f1`              → `targetField` + `fields`
 * - `DENSE_VECTOR suffix = "_dv" ON f1, f2` → `suffix` + `fields`
 *
 * `suffix` is only populated once `ON` is parsed, so the first two positions cover everything
 * typed before it.
 */
export declare function getPosition(command: ESQLAstDenseVectorCommand, cursorPosition: number): CaretPosition;
/**
 * The expressions making up the top-level field list. Option nodes (`ON`, `WITH`) are dropped
 * so only the field expressions remain — including the leading `target = field` assignment,
 * which `suggestFieldsList` unwraps on its own.
 */
export declare const getFieldListExpressions: (command: ESQLAstDenseVectorCommand) => ESQLAstField[];
/**
 * Text typed after the DENSE_VECTOR keyword and before the cursor.
 *
 * The guards below read the text rather than the AST because the autocomplete parse path drops
 * the trailing empty column after a comma: `DENSE_VECTOR a, ` and `DENSE_VECTOR a ` both yield
 * `fields: ['a']`, so the AST alone cannot tell which list position the cursor is in.
 */
export declare const getTextAfterCommandKeyword: (query: string, command: ESQLAstDenseVectorCommand, cursorPosition: number) => string;
/**
 * Whether the `suffix = "..." ON` modifier can still be typed: it must come first and only
 * once, so only while nothing at all has been typed after the keyword. That also rules out a
 * target assignment, which cannot exist without a `=` in the text.
 */
export declare const canSuggestSuffixModifier: (query: string, command: ESQLAstDenseVectorCommand, cursorPosition: number) => boolean;
/**
 * Whether the cursor sits after a `suffix = "..."` clause that still needs its `ON <fields>`.
 *
 * The parser only populates {@link ESQLAstDenseVectorCommand.suffix} once `ON` is present, and
 * builds nothing at all before that, so this state is invisible in the AST and has to be read
 * from the text. Without it the field list would be suggested, which would produce
 * `DENSE_VECTOR suffix = "_dv" field`.
 */
export declare const isAwaitingSuffixOn: (query: string, command: ESQLAstDenseVectorCommand, cursorPosition: number) => boolean;
/**
 * Whether a `col0 = ` suggestion is valid at the cursor. The grammar only accepts an assignment
 * as the first item of the list — `DENSE_VECTOR a, col0 = b` is a syntax error.
 */
export declare const canSuggestTargetAssignment: (query: string, command: ESQLAstDenseVectorCommand, cursorPosition: number) => boolean;
/**
 * The identifier on the left of the naming assignment (`suffix = "_dv"`, `vec = field`), when
 * the command has one.
 *
 * The parser accepts any identifier there and does not keep it on the command, so callers must
 * check it against {@link DENSE_VECTOR_SUFFIX_KEYWORD} themselves — Elasticsearch rejects
 * anything else in front of a suffix.
 */
export declare const getNamingKeyword: (command: ESQLAstDenseVectorCommand) => ESQLColumn | ESQLIdentifier | undefined;
/**
 * Names of the `dense_vector` columns the command generates. The source fields are kept, so
 * these are always additional — unlike the sibling TEXT command, which replaces them.
 *
 * One name per input field, suffixed. `target = <field>` instead names a single output column.
 */
export declare const getDenseVectorColumnNames: (command: ESQLAstDenseVectorCommand) => string[];
