import type { monaco } from '../../../monaco_imports';
export declare const buildEsqlStartRule: (tripleQuotes: boolean, esqlRoot?: string) => (RegExp | (string | {
    token: string;
    next: string;
    nextEmbedded: "esql";
} | {
    token: string;
    next: string;
    nextEmbedded?: undefined;
})[])[];
export declare const buildEsqlRules: (esqlRoot?: string) => Record<string, monaco.languages.IMonarchLanguageRule[]>;
export declare const esqlLanguageAttributes: {
    keywords: string[];
    builtinFunctions: string[];
};
