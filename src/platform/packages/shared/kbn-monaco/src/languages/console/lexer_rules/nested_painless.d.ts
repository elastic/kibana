import type { monaco } from '../../../monaco_imports';
export declare const buildPainlessStartRule: (painlessRoot?: string) => (RegExp | (string | {
    token: string;
    next: string;
})[])[];
export declare const buildPainlessRules: (painlessRoot?: string) => Record<string, monaco.languages.IMonarchLanguageRule[]>;
export declare const painlessLanguageAttributes: {
    keywords: string[];
    primitives: string[];
    constants: string[];
    operators: string[];
    symbols: RegExp;
    digits: RegExp;
    octaldigits: RegExp;
    binarydigits: RegExp;
    hexdigits: any;
};
