import type { EuiThemeComputed } from '@elastic/eui';
import { CODE_EDITOR_DEFAULT_THEME_ID, defaultThemesResolvers } from '@kbn/monaco';
import type { monaco as Monaco } from '@kbn/monaco';
export declare const WORKFLOWS_MONACO_EDITOR_THEME = "workflows-theme";
type WorkflowsMonacoThemeBase = ReturnType<(typeof defaultThemesResolvers)[typeof CODE_EDITOR_DEFAULT_THEME_ID]>;
export declare const buildWorkflowsMonacoThemeDefinition: (themeBase: WorkflowsMonacoThemeBase, euiTheme: EuiThemeComputed) => Monaco.editor.IStandaloneThemeData;
export declare const defineWorkflowsMonacoTheme: (themeBase: WorkflowsMonacoThemeBase, euiTheme: EuiThemeComputed) => void;
/** Registers the workflows Monaco theme without changing the global editor theme. */
export declare function useDefineWorkflowsMonacoTheme(): void;
export declare function useWorkflowsMonacoTheme(): void;
export {};
