import type { monaco } from '../../../monaco_imports';
export declare const buildXjsonRules: (root?: string) => {
    [x: string]: (RegExp | {
        token: string;
        nextEmbedded: string;
        next: string;
    })[][] | ((string | RegExp)[] | (RegExp | (string | {
        token: string;
        nextEmbedded: string;
        next: string;
    })[])[] | (RegExp | {
        token: string;
        next: string;
    })[] | (RegExp | {
        token: string;
    })[] | (RegExp | {
        token: string;
        bracket: string;
        next: string;
    })[])[];
    my_painless: (RegExp | {
        token: string;
        nextEmbedded: string;
        next: string;
    })[][];
    my_sql: (RegExp | {
        token: string;
        nextEmbedded: string;
        next: string;
    })[][];
    string: ((string | RegExp)[] | (RegExp | {
        token: string;
        bracket: string;
        next: string;
    })[])[];
    string_literal: ((RegExp | {
        token: string;
        next: string;
    })[] | (RegExp | {
        token: string;
    })[])[];
};
export declare const lexerRules: monaco.languages.IMonarchLanguage;
export declare const languageConfiguration: monaco.languages.LanguageConfiguration;
