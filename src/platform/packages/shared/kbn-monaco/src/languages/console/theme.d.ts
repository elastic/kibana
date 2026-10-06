import { type UseEuiTheme } from '@elastic/eui';
export declare const buildConsoleTheme: ({ colorMode, euiTheme, ...rest }: UseEuiTheme) => {
    base: import("monaco-types").editor.BuiltinTheme;
    inherit: boolean;
    encodedTokensColors?: string[];
    rules: (import("monaco-types").editor.ITokenThemeRule | {
        token: string;
        foreground: string;
        fontStyle: string;
    })[];
    colors: {
        'editorLineNumber.foreground': string;
    };
};
