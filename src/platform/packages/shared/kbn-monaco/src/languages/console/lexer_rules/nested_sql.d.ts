import type { monaco } from '../../../monaco_imports';
export declare const buildSqlStartRule: (sqlRoot?: string) => (RegExp | (string | {
    token: string;
    next: string;
})[])[];
export declare const buildSqlRules: (sqlRoot?: string) => Record<string, monaco.languages.IMonarchLanguageRule[]>;
export declare const sqlLanguageAttributes: {
    keywords: string[];
    builtinFunctions: string[];
};
