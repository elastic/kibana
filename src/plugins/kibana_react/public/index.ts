/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

export * from './code_editor';
export * from './exit_full_screen_button';
export * from './context';
export * from './overview_page';
export * from './overlays';
export * from './ui_settings';
export * from './field_icon';
export * from './field_button';
export * from './table_list_view';
export * from './split_panel';
export * from './react_router_navigate';
export { ValidatedDualRange, Value } from './validated_range';
export * from './notifications';
export { Markdown, MarkdownSimple } from './markdown';
export { reactToUiComponent, uiToReactComponent } from './adapters';
export { useUrlTracker } from './use_url_tracker';
export { toMountPoint, MountPointPortal } from './util';
export { RedirectAppLinks } from './app_links';

/** dummy plugin, we just want kibanaReact to have its own bundle */
export function plugin() {
  return new (class KibanaReactPlugin {
    setup() {}
    start() {}
  })();
}
