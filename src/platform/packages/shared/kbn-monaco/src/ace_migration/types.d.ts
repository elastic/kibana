export declare enum AnnoTypes {
    error = "error",
    warning = "warning"
}
export interface Annotation {
    name?: string;
    type: AnnoTypes;
    text: string;
    at: number;
}
export interface ParseResult {
    annotations: Annotation[];
}
export type Parser = (source: string) => ParseResult;
export interface ParserWorker {
    parse: (model: string) => Promise<ParseResult | undefined>;
}
