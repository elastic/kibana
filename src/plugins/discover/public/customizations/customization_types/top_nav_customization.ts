/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { TopNavMenuData, TopNavMenuBadgeProps } from '@kbn/navigation-plugin/public';

export interface TopNavDefaultItem {
  disabled?: boolean;
  order?: number;
}

export interface TopNavDefaultMenu {
  newItem?: TopNavDefaultItem;
  openItem?: TopNavDefaultItem;
  shareItem?: TopNavDefaultItem;
  alertsItem?: TopNavDefaultItem;
  inspectItem?: TopNavDefaultItem;
  saveItem?: TopNavDefaultItem;
}

export interface TopNavMenuItem {
  data: TopNavMenuData;
  order: number;
}

export interface TopNavDefaultBadges {
  unsavedChangesBadge?: TopNavDefaultItem;
}

export interface TopNavBadge {
  data: TopNavMenuBadgeProps;
  order: number;
}

export interface TopNavCustomization {
  id: 'top_nav';
  defaultMenu?: TopNavDefaultMenu;
  getMenuItems?: () => TopNavMenuItem[];
  defaultBadges?: TopNavDefaultBadges;
  getBadges?: () => TopNavBadge[];
}
