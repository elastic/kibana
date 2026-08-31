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
export { AppHeaderLoading, AppHeaderLoadingView } from './app_header';
export type { AppHeaderLoadingProps, AppHeaderLoadingMenu } from './app_header';
export {
  ChromeAppHeaderRegistration,
  useChromeAppHeaderRegistration,
  SuppressChromeBackButton,
} from './app_header';
export { APP_HEADER_TEST_SUBJECTS } from '@kbn/ui-app-header';
export {
  APP_MENU_TEST_SUBJECTS,
  getAppMenuItemTestSubj,
  getAppMenuActionButtonTestSubj,
} from '@kbn/app-menu';
export type {
  AppHeaderBack,
  AppHeaderBadge,
  AppHeaderBadgeItem,
  AppHeaderTab,
  AppHeaderTabAction,
  AppHeaderTabActions,
  AppHeaderTabBadge,
  AppHeaderTabIconBadge,
  AppHeaderDescription,
  AppHeaderEditableTitle,
  AppHeaderFavoriteAction,
  AppHeaderFavoriteStatus,
  AppHeaderShareAction,
  AppHeaderMetadataButtonItem,
  AppHeaderMetadataHealthItem,
  AppHeaderMetadataItem,
  AppHeaderMetadataItems,
  AppHeaderMetadataTextItem,
  AppHeaderMenu,
  AppHeaderSpacing,
  AppHeaderConfig,
  ChromeAppHeaderConfig,
  AppHeaderTitle,
  AppHeaderTitleSaveResult,
} from './types';
