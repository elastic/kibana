/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

export type { UrlTemplateEditorVariable, UrlTemplateEditorProps } from './url_template_editor';
export { UrlTemplateEditor } from './url_template_editor';

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

export {
  useUiSetting,
  useGlobalUiSetting,
  useUiSetting$,
  useGlobalUiSetting$,
} from './ui_settings';

export { useDarkMode } from './dark_mode';

export { useExecutionContext } from './use_execution_context';

export { reactRouterNavigate, reactRouterOnClickHandler } from './react_router_navigate';

export type {
  NoDataPageActions,
  NoDataPageActionsProps,
  NoDataPageProps,
  ElasticAgentCardProps,
} from './page_template';
export {
  KibanaPageTemplateSolutionNavAvatar,
  NO_DATA_RECOMMENDED,
  NoDataPage,
  ElasticAgentCard,
  NoDataCard,
} from './page_template';

export type { Value } from './validated_range';
export { ValidatedDualRange } from './validated_range';

export type { ToastInput, KibanaReactNotifications } from './notifications';
export { createNotifications } from './notifications';

export { toMountPoint } from './util';
export type { ToMountPointOptions } from './util';

/** @deprecated Use `KibanaThemeProvider`, `wrapWithTheme` from `@kbn/react-kibana-context-theme`  */
export { KibanaThemeProvider, wrapWithTheme, type KibanaThemeProviderProps } from './theme';

/** dummy plugin, we just want kibanaReact to have its own bundle */
export function plugin() {
  return new (class KibanaReactPlugin {
    setup() {}

    start() {}
  })();
}
