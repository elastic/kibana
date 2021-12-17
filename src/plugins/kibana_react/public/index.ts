/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

// TODO: https://github.com/elastic/kibana/issues/109898
/* eslint-disable @kbn/eslint/no_export_all */

export * from './code_editor';
export * from './url_template_editor';
export * from './exit_full_screen_button';
export * from './context';
export * from './overview_page';
export * from './overlays';
export * from './ui_settings';
export * from './table_list_view';
export * from './toolbar_button';
export * from './split_panel';
export * from './react_router_navigate';
export * from './page_template';
export type { Value } from './validated_range';
export { ValidatedDualRange } from './validated_range';
export * from './notifications';
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
