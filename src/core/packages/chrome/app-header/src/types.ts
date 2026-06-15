/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import type { AppMenuConfig } from '@kbn/core-chrome-app-menu-components';
import type {
  AppHeaderBack as CoreAppHeaderBack,
  AppHeaderBadge as CoreAppHeaderBadge,
  AppHeaderBadgeItem as CoreAppHeaderBadgeItem,
  AppHeaderConfig as CoreAppHeaderConfig,
  AppHeaderEditableTitle as CoreAppHeaderEditableTitle,
  AppHeaderMetadataButtonItem as CoreAppHeaderMetadataButtonItem,
  AppHeaderMetadataHealthItem as CoreAppHeaderMetadataHealthItem,
  AppHeaderMetadataItem as CoreAppHeaderMetadataItem,
  AppHeaderMetadataItems as CoreAppHeaderMetadataItems,
  AppHeaderMetadataTextItem as CoreAppHeaderMetadataTextItem,
  AppHeaderTab as CoreAppHeaderTab,
  AppHeaderTitle as CoreAppHeaderTitle,
  AppHeaderTitleSaveResult as CoreAppHeaderTitleSaveResult,
} from '@kbn/core-chrome-browser';

export type AppHeaderMenu = AppMenuConfig;
export type AppHeaderBack = CoreAppHeaderBack;
export type AppHeaderBadge = CoreAppHeaderBadge;
export type AppHeaderBadgeItem = CoreAppHeaderBadgeItem;
export type AppHeaderConfig = CoreAppHeaderConfig;
export type AppHeaderEditableTitle = CoreAppHeaderEditableTitle;
export type AppHeaderMetadataButtonItem = CoreAppHeaderMetadataButtonItem;
export type AppHeaderMetadataHealthItem = CoreAppHeaderMetadataHealthItem;
export type AppHeaderMetadataItem = CoreAppHeaderMetadataItem;
export type AppHeaderMetadataItems = CoreAppHeaderMetadataItems;
export type AppHeaderMetadataTextItem = CoreAppHeaderMetadataTextItem;
export type AppHeaderTab = CoreAppHeaderTab;
export type AppHeaderTitle = CoreAppHeaderTitle;
export type AppHeaderTitleSaveResult = CoreAppHeaderTitleSaveResult;

export type AppHeaderPadding =
  | 'none'
  | 'm'
  | {
      bleed: 'm' | 'l';
      size?: 'none' | 'm' | 'l';
    };
