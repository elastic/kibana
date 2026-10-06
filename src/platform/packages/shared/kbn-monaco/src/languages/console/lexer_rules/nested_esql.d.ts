import type { monaco } from '../../../monaco_imports';
export declare const buildEsqlStartRule: (tripleQuotes: boolean, esqlRoot?: string) => ((string | {
    token: string;
    next: string;
    nextEmbedded: "esql";
} | {
    nextEmbedded?: undefined;
    token: string;
    next: string;
})[] | RegExp)[];
export declare const buildEsqlRules: (esqlRoot?: string) => Record<string, monaco.languages.IMonarchLanguageRule[]>;
export declare const esqlLanguageAttributes: {
    keywords: string[];
    builtinFunctions: string[];
};
