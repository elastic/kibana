/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ReactElement } from 'react';
import type { IconType, EuiBadgeProps, EuiToolTipProps } from '@elastic/eui';
import type { ChromeExtensionContent } from '@kbn/core-mount-utils-browser';

/** @public */
export interface ChromeBadge {
  text: string;
  tooltip: string;
  iconType?: IconType;
}

/** @public */
export type ChromeBreadcrumbsBadge = EuiBadgeProps & {
  badgeText: string;
  toolTipProps?: Partial<EuiToolTipProps>;
  renderCustomBadge?: (props: { badgeText: string }) => ReactElement;
};

/**
 * @example
 * Set a banner using a lazy-loaded component (recommended):
 * ```tsx
 * import { dynamic } from '@kbn/shared-ux-utility';
 *
 * const LazyBanner = dynamic(() => import('./my_banner'));
 *
 * chrome.setHeaderBanner({ content: <LazyBanner /> });
 * ```
 *
 * @public
 */
export interface ChromeUserBanner {
  content: ChromeExtensionContent<HTMLDivElement>;
}

/** @public */
export type ChromeStyle = 'classic' | 'project';
