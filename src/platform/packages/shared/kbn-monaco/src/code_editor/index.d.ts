import { CODE_EDITOR_DEFAULT_THEME_ID, CODE_EDITOR_TRANSPARENT_THEME_ID } from './constants';
export declare const defaultThemesResolvers: {
    codeEditorDefaultTheme: typeof import("./theme").createTheme;
    codeEditorTransparentTheme: (euiTheme: import("@elastic/eui/src/services/theme/hooks").UseEuiTheme) => import("monaco-types").editor.IStandaloneThemeData;
};
export { CODE_EDITOR_DEFAULT_THEME_ID, CODE_EDITOR_TRANSPARENT_THEME_ID };
