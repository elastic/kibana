export declare const parseLine: (line: string, parseUrlIntoTokens?: boolean) => ParsedLineTokens;
export declare const parseUrl: (url: string) => {
    urlPathTokens: ParsedLineTokens["urlPathTokens"];
    urlParamsTokens: ParsedLineTokens["urlParamsTokens"];
};
export declare const parseBody: (value: string) => string[];
export declare const removeTrailingWhitespaces: (url: string) => string;
export declare const getLineTokens: (lineContent: string) => string[];
export declare const containsUrlParams: (lineContent: string) => boolean;
interface ParsedLineTokens {
    method: string;
    url: string;
    urlPathTokens: string[];
    urlParamsTokens: string[][];
}
export {};
