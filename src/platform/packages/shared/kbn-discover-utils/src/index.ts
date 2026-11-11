/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

// Everything exported from here must stay free of EUI and other browser-only libraries so that
// server code can import `@kbn/discover-utils` without loading them.
// React components, hooks and EUI-dependent helpers live in `@kbn/discover-utils/components`.

export * from './constants';
export * as fieldConstants from './field_constants';
export * from './utils';
export * from './data_types';

export { AppMenuRegistry } from './components/app_menu/app_menu_registry';
export type {
  DiscoverAppMenuItemType,
  DiscoverAppMenuPopoverItem,
  DiscoverAppMenuPrimaryActionItem,
  DiscoverAppMenuRenderAction,
  DiscoverAppMenuRunAction,
  DiscoverAppMenuRunActionParams,
  DiscoverAppMenuContext,
  DiscoverAppMenuConfig,
} from './components/app_menu/types';
