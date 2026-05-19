export interface ErrorAnnotation {
    offset: number;
    text: string;
}
export interface ParsedRequest {
    startOffset: number;
    endOffset?: number;
}
export interface ConsoleParserResult {
    errors: ErrorAnnotation[];
    requests: ParsedRequest[];
}
export interface ConsoleOutputParsedResponse {
    startOffset: number;
    endOffset?: number;
    data?: unknown[];
}
export interface ConsoleOutputParserResult {
    errors: ErrorAnnotation[];
    responses: ConsoleOutputParsedResponse[];
}
export interface ConsoleWorkerDefinition {
    getParserResult: (modelUri: string) => ConsoleParserResult | undefined;
}
export type ConsoleParserReviver = (this: unknown, key: string, value: unknown) => unknown;
export interface ConsoleParser {
    (source: string): ConsoleParserResult | undefined;
    (source: string, reviver: ConsoleParserReviver): unknown;
}
export interface ConsoleOutputParser {
    (source: string): ConsoleOutputParserResult | undefined;
    (source: string, reviver: ConsoleParserReviver): unknown;
}
