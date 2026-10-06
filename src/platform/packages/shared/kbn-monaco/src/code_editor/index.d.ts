import { CODE_EDITOR_DEFAULT_THEME_ID, CODE_EDITOR_TRANSPARENT_THEME_ID } from './constants';
import { buildTransparentTheme } from './theme';
export declare const defaultThemesResolvers: {
    codeEditorDefaultTheme: typeof import("./theme").createTheme;
    codeEditorTransparentTheme: typeof buildTransparentTheme;
};
export { CODE_EDITOR_DEFAULT_THEME_ID, CODE_EDITOR_TRANSPARENT_THEME_ID };
