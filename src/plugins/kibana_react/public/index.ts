/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

export type { CodeEditorProps } from '@kbn/react-public';
export {
  CssLang,
  MarkdownLang,
  YamlLang,
  HandlebarsLang,
  HJsonLang,
  CodeEditor,
  CodeEditorField,
} from '@kbn/react-public';

export type { UrlTemplateEditorVariable, UrlTemplateEditorProps } from '@kbn/react-public';
export { UrlTemplateEditor } from '@kbn/react-public';

export type { ExitFullScreenButtonProps } from '@kbn/react-public';
export { ExitFullScreenButton } from '@kbn/react-public';

export type {
  KibanaReactContext,
  KibanaReactContextValue,
  KibanaServices,
} from '@kbn/react-public';
export {
  context,
  createKibanaReactContext,
  KibanaContextProvider,
  useKibana,
  withKibana,
} from '@kbn/react-public';

export { overviewPageActions, OverviewPageFooter } from '@kbn/react-public';

export type { KibanaReactOverlays } from '@kbn/react-public';
export { createReactOverlays } from '@kbn/react-public';

export {
  useUiSetting,
  useGlobalUiSetting,
  useUiSetting$,
  useGlobalUiSetting$,
} from '@kbn/react-public';

export { useExecutionContext } from '@kbn/react-public';

export type { ToolbarButtonProps } from '@kbn/react-public';
/** @deprecated ToolbarButton - use `ToolbarButton` from `@kbn/shared-ux-button-toolbar` */
export { POSITIONS, WEIGHTS, TOOLBAR_BUTTON_SIZES, ToolbarButton } from '@kbn/react-public';

export { Route } from '@kbn/react-public';

export { reactRouterNavigate, reactRouterOnClickHandler } from '@kbn/react-public';

export type {
  KibanaPageTemplateProps,
  NoDataPageActions,
  NoDataPageActionsProps,
  NoDataPageProps,
  ElasticAgentCardProps,
} from '@kbn/react-public';
export {
  KibanaPageTemplate,
  KibanaPageTemplateSolutionNavAvatar,
  NO_DATA_PAGE_MAX_WIDTH,
  NO_DATA_PAGE_TEMPLATE_PROPS,
  NO_DATA_RECOMMENDED,
  NoDataPage,
  ElasticAgentCard,
  NoDataCard,
} from '@kbn/react-public';

export type { Value } from '@kbn/react-public';
export { ValidatedDualRange } from '@kbn/react-public';

export type { ToastInput, KibanaReactNotifications } from '@kbn/react-public';
export { createNotifications } from '@kbn/react-public';

/** @deprecated use `Markdown` from `@kbn/shared-ux-markdown` */
export { Markdown, MarkdownSimple } from '@kbn/react-public';

export { toMountPoint, MountPointPortal } from '@kbn/react-public';
export type { ToMountPointOptions } from '@kbn/react-public';

/** @deprecated Use `RedirectAppLinks` from `@kbn/shared-ux-link-redirect-app` */
export { RedirectAppLinks } from '@kbn/react-public';

export { wrapWithTheme, KibanaThemeProvider } from '@kbn/react-public';

/** dummy plugin, we just want kibanaReact to have its own bundle */
export function plugin() {
  return new (class KibanaReactPlugin {
    setup() {}
    start() {}
  })();
}
