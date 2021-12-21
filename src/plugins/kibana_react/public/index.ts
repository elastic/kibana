/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

export {
  CodeEditorProps,
  CodeEditor,
  CodeEditorField,
  CssLang,
  MarkdownLang,
  YamlLang,
  HandlebarsLang,
  HJsonLang,
} from './code_editor';

export {
  UrlTemplateEditorVariable,
  UrlTemplateEditorProps,
  UrlTemplateEditor,
} from './url_template_editor';

export { ExitFullScreenButtonProps, ExitFullScreenButton } from './exit_full_screen_button';

export type { KibanaReactContext, KibanaReactContextValue, KibanaServices } from './context';
export {
  context,
  createKibanaReactContext,
  KibanaContextProvider,
  useKibana,
  withKibana,
} from './context';

export { overviewPageActions, OverviewPageFooter } from './overview_page';

export type { KibanaReactOverlays } from './overlays';
export { createReactOverlays } from './overlays';

export { useUiSetting, useUiSetting$ } from './ui_settings';

export type { TableListViewProps, TableListViewState } from './table_list_view';
export { TableListView } from './table_list_view';

export type { ToolbarButtonProps } from './toolbar_button';
export { POSITIONS, WEIGHTS, TOOLBAR_BUTTON_SIZES, ToolbarButton } from './toolbar_button';

export { Panel, PanelsContainer } from './split_panel';

export { reactRouterNavigate, reactRouterOnClickHandler } from './react_router_navigate';

export type {
  KibanaPageTemplateProps,
  NoDataPageActions,
  NoDataPageActionsProps,
  NoDataPageProps,
  ElasticAgentCardProps,
} from './page_template';
export {
  KibanaPageTemplate,
  KibanaPageTemplateSolutionNavAvatar,
  NO_DATA_PAGE_MAX_WIDTH,
  NO_DATA_PAGE_TEMPLATE_PROPS,
  NO_DATA_RECOMMENDED,
  NoDataPage,
  ElasticAgentCard,
  NoDataCard,
} from './page_template';

export type { Value } from './validated_range';
export { ValidatedDualRange } from './validated_range';

export { ToastInput, KibanaReactNotifications, createNotifications } from './notifications';

export { Markdown, MarkdownSimple } from './markdown';

export { reactToUiComponent, uiToReactComponent } from './adapters';

export { toMountPoint, MountPointPortal } from './util';
export type { ToMountPointOptions } from './util';

export { RedirectAppLinks } from './app_links';

export { wrapWithTheme, KibanaThemeProvider } from './theme';

/** dummy plugin, we just want kibanaReact to have its own bundle */
export function plugin() {
  return new (class KibanaReactPlugin {
    setup() {}
    start() {}
  })();
}
