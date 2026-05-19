import type { monaco } from '../../../..';
export declare const consoleSharedLanguageConfiguration: monaco.languages.LanguageConfiguration;
export declare const matchToken: (token: string, regex: string | RegExp, nextState?: string) => {
    regex: string | RegExp;
    action: {
        token: string;
        next: string;
    };
} | {
    regex: string | RegExp;
    action: {
        token: string;
        next?: undefined;
    };
};
export declare const matchTokens: (tokens: string[], regex: string | RegExp, nextState?: string) => {
    regex: string | RegExp;
    action: (string | {
        token: string;
        next: string;
    })[];
};
export declare const matchTokensWithEOL: (tokens: string | string[], regex: string | RegExp, nextIfEOL: string, normalNext?: string) => {
    regex: string | RegExp;
    action: {
        cases: {
            '@eos': (string | {
                token: string;
                next: string;
            })[];
            '@default': (string | {
                token: string;
                next: string;
            })[];
        };
    };
} | {
    regex: string | RegExp;
    action: {
        cases: {
            '@eos': {
                token: string;
                next: string;
            };
            '@default': {
                token: string;
                next: string | undefined;
            };
        };
    };
};
export declare const consoleSharedLexerRules: monaco.languages.IMonarchLanguage;
