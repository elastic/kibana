import type { monaco } from '../../../monaco_imports';
export interface Language extends monaco.languages.IMonarchLanguage {
    default: string;
    brackets: monaco.languages.IMonarchLanguage['brackets'];
    keywords: string[];
    symbols: RegExp;
    escapes: RegExp;
    digits: RegExp;
    primitives: string[];
    octaldigits: RegExp;
    binarydigits: RegExp;
    constants: string[];
    operators: string[];
}
export declare const lexerRules: Language;
export declare const languageConfiguration: monaco.languages.LanguageConfiguration;
