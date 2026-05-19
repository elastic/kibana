export interface GrokColumn {
    name: string;
    type: string;
}
export declare function unquoteTemplate(inputString: string): string;
export declare function extractSemanticsFromGrok(pattern: string): GrokColumn[];
