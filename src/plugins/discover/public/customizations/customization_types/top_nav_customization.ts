/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { TopNavMenuData } from '@kbn/navigation-plugin/public';

export interface TopNavDefaultMenuItem {
  disabled?: boolean;
  order?: number;
}

export interface TopNavDefaultMenu {
  newItem?: TopNavDefaultMenuItem;
  openItem?: TopNavDefaultMenuItem;
  shareItem?: TopNavDefaultMenuItem;
  alertsItem?: TopNavDefaultMenuItem;
  inspectItem?: TopNavDefaultMenuItem;
  saveItem?: TopNavDefaultMenuItem;
}

export interface TopNavMenuItem {
  data: TopNavMenuData;
  order: number;
}

export interface TopNavCustomization {
  id: 'top_nav';
  defaultMenu?: TopNavDefaultMenu;
  getMenuItems?: () => TopNavMenuItem[];
}
