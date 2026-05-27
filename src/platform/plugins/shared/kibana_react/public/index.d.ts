export type { UrlTemplateEditorVariable, UrlTemplateEditorProps } from './url_template_editor';
export { UrlTemplateEditor } from './url_template_editor';
export type { KibanaReactContext, KibanaReactContextValue, KibanaServices } from './context';
export { context, createKibanaReactContext, KibanaContextProvider, useKibana, withKibana, } from './context';
export { overviewPageActions, OverviewPageFooter } from './overview_page';
export type { KibanaReactOverlays } from './overlays';
export { createReactOverlays } from './overlays';
export { useUiSetting, useGlobalUiSetting, useUiSetting$, useGlobalUiSetting$, } from './ui_settings';
export { useDarkMode } from './dark_mode/use_dark_mode';
export { useExecutionContext } from './use_execution_context';
export { reactRouterNavigate, reactRouterOnClickHandler } from './react_router_navigate';
export type { NoDataPageActions, NoDataPageActionsProps, NoDataPageProps, ElasticAgentCardProps, } from './page_template';
export { KibanaPageTemplateSolutionNavAvatar, NO_DATA_RECOMMENDED, NoDataPage, ElasticAgentCard, NoDataCard, } from './page_template';
export type { Value } from './validated_range';
export { ValidatedDualRange } from './validated_range';
/** @deprecated use `Markdown` from `@kbn/shared-ux-markdown` */
export { Markdown, MarkdownSimple } from './markdown';
export { toMountPoint } from './util';
export type { ToMountPointOptions } from './util';
/** @deprecated Use `KibanaThemeProvider`, `wrapWithTheme` from `@kbn/react-kibana-context-theme`  */
export { KibanaThemeProvider, wrapWithTheme, type KibanaThemeProviderProps } from './theme';
/** dummy plugin, we just want kibanaReact to have its own bundle */
export declare function plugin(): {
    setup(): void;
    start(): void;
};
