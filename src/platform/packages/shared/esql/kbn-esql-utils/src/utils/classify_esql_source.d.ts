export type ESQLSourceKind = 'single' | 'multi' | 'pattern';
/**
 * Classifies an ES|QL FROM/TS source expression into one of three kinds:
 * - `'single'`:   a single index or data stream with no wildcards
 * - `'pattern'`: a single source expression containing a `*` wildcard
 * - `'multi'`:   a comma-separated list of two or more sources
 *
 * Remote-cluster prefixes (`cluster:index`) and source selectors (`::failures`)
 * are handled via AST parsing, so the classification is robust against quoting
 * and other syntax edge cases.
 */
export declare const classifyESQLSource: (source: string) => ESQLSourceKind;
export declare const isSingleSource: (source: string | undefined) => source is string;
