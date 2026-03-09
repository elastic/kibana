/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ReactElement, ReactNode } from 'react';
import type { IconType, EuiBadgeProps, EuiToolTipProps } from '@elastic/eui';
import type { MountPoint } from '@kbn/core-mount-utils-browser';

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
 * Set a banner using a React node (recommended):
 * ```tsx
 * chrome.setHeaderBanner({ content: <MyBanner /> });
 * ```
 *
 * @public
 */
export interface ChromeUserBanner {
  /**
   * The banner content as a React node.
   */
  content?: ReactNode;
  /**
   * @deprecated Use {@link ChromeUserBanner.content} instead.
   */
  mount?: MountPoint<HTMLDivElement>;
}

/** @public */
export type ChromeStyle = 'classic' | 'project';
