import type { ESQLAstAllCommands } from '@elastic/esql/types';
export declare enum PromqlParamValueType {
    TimeseriesSources = "timeseries_sources",
    DateLiterals = "date_literals",
    Static = "static"
}
export declare enum PromqlParamName {
    Index = "index",
    Time = "time",
    Step = "step",
    Start = "start",
    End = "end",
    Buckets = "buckets",
    ScrapeInterval = "scrape_interval"
}
export interface PromqlParamDefinition {
    name: string;
    description: string;
    valueType: PromqlParamValueType;
    required?: boolean;
    suggestedValues?: string[];
}
type ParamPositionKind = 'after_command' | 'after_param_keyword' | 'after_param_equals';
export type PromqlMacroPosition = {
    type: 'params';
    kind: ParamPositionKind;
    currentParam?: string;
    shouldWrap: boolean;
    preGroupedAgg?: string;
} | {
    type: 'query';
    queryText: string;
    cursorRelative: number;
    shouldWrap: boolean;
};
export declare const IDENTIFIER_PATTERN = "[A-Za-z_][A-Za-z0-9_]*";
export declare const PROMQL_PARAMS: PromqlParamDefinition[];
export declare const PROMQL_PARAM_NAMES: string[];
export declare const PROMQL_RANGE_PARAM_NAMES: readonly [PromqlParamName.Step, PromqlParamName.Buckets, PromqlParamName.Start, PromqlParamName.End];
export declare const PROMQL_PARAM_CONFLICTS: Readonly<Record<string, readonly string[]>>;
export declare function isPromqlParamAvailable(name: string, usedParams: Set<string>): boolean;
export declare function getPosition(innerText: string, command: ESQLAstAllCommands, commandText: string | undefined): PromqlMacroPosition;
export declare const isPromqlParamName: (name: string) => boolean;
/**
 * Detects if text looks like a param assignment.
 * Matches: "index", "index=", "index=value", or ",..." (comma continuation).
 */
export declare function looksLikePromqlParamAssignment(text: string): boolean;
/** Scans command text to find used params (includes params after cursor for filtering). */
export declare function getUsedPromqlParamNames(commandText: string): Set<string>;
export declare function getPromqlParam(name: string): PromqlParamDefinition | undefined;
export declare function isParamValueComplete(fullQuery: string, cursorPosition: number, currentParam?: string): boolean;
export declare function isAtValidColumnSuggestionPosition(fullCommandText: string, cursorPosition: number): boolean;
interface IndexAssignmentContext {
    valueText: string;
    valueStart: number;
}
/** Extracts the raw index value text so we can reuse source-suggestion logic. */
export declare function getIndexAssignmentContext(commandText: string): IndexAssignmentContext | undefined;
export {};
