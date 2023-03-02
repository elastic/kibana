/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type React from 'react';
import type { UiCounterMetricType } from '@kbn/analytics';

export interface DefaultSideNavItem<T extends string = string> {
  id: T;
  label: string;
  href: string;
  onClick?: React.MouseEventHandler;
  description?: string;
  items?: Array<DefaultSideNavItem<T>>;
  categories?: LinkCategories<T>;
  isBeta?: boolean;
  betaOptions?: {
    text: string;
  };
}

export interface CustomSideNavItem<T extends string = string> {
  id: T;
  render: (isSelected: boolean) => React.ReactNode;
}

export type SideNavItem<T extends string = string> = DefaultSideNavItem<T> | CustomSideNavItem<T>;

export interface LinkCategory<T extends string = string> {
  label: string;
  linkIds: readonly T[];
}

export type LinkCategories<T extends string = string> = Readonly<Array<LinkCategory<T>>>;

export type Tracker = (
  type: UiCounterMetricType,
  event: string | string[],
  count?: number | undefined
) => void;

export const isCustomItem = (navItem: SideNavItem): navItem is CustomSideNavItem =>
  'render' in navItem;
export const isDefaultItem = (navItem: SideNavItem): navItem is DefaultSideNavItem =>
  !isCustomItem(navItem);
