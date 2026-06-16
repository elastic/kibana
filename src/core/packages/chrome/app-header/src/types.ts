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

// Controls the header's HORIZONTAL layout only. Vertical padding is standardized internally so
// the header keeps a consistent height regardless of this value.
export type AppHeaderPadding =
  | 'none' // no horizontal padding, no bleed
  | 'm' // symmetric horizontal padding
  | {
      /**
       * Negative margin on left/right + top: cancels a padded container so the header spans to
       * its edges and sits flush at the top. Set this to your container's padding when rendering
       * the header inline inside a padded page template. Content is auto re-inset to match, so it
       * stays aligned with the page gutter.
       */
      bleed: 'm' | 'l';
    };
