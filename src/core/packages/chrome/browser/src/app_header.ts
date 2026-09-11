/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DistributiveOmit } from '@elastic/eui';
import type { AppHeaderBack, AppHeaderConfig } from '@kbn/ui-app-header';

/**
 * Presentation types owned by `@kbn/ui-app-header`. Re-exported so existing
 * `@kbn/core-chrome-browser` imports stay valid.
 *
 * @public
 */
export type {
  AppHeaderBack,
  AppHeaderBadge,
  AppHeaderBadgeItem,
  AppHeaderConfig,
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
  AppHeaderSpacing,
  AppHeaderTab,
  AppHeaderTabAction,
  AppHeaderTabActions,
  AppHeaderTabBadge,
  AppHeaderTabIconBadge,
  AppHeaderTitle,
  AppHeaderTitleSaveResult,
} from '@kbn/ui-app-header';

/**
 * Chrome-owned registration config. Unlike {@link AppHeaderConfig}, `back` may be `false` to
 * suppress the breadcrumb-derived fallback.
 *
 * @public
 */
export type ChromeAppHeaderConfig = DistributiveOmit<AppHeaderConfig, 'back'> & {
  back?: AppHeaderBack | false;
};
