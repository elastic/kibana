/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export { AppHeader, AppHeaderView } from './app_header';
export type { AppHeaderProps, AppHeaderViewProps } from './app_header';
export type {
  AppHeaderBack,
  AppHeaderBadge,
  AppHeaderTab,
  AppHeaderMenu,
  AppHeaderPadding,
} from './types';
export {
  APP_HEADER_HEIGHT_CSS_VAR_NAME,
  APPLICATION_TOP_BAR_MIN_HEIGHT_PX,
} from './app_header/app_header_shell';
export type { AppHeaderWithFallbackProps } from './app_header_with_fallback';
export { AppHeaderWithFallback } from './app_header_with_fallback';
