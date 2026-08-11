/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { RegisteredTopNavMenuData } from './top_nav_menu_data';

/**
 * @deprecated Use AppMenu from "@kbn/core-chrome-app-menu" instead
 */
export class TopNavMenuExtensionsRegistry {
  private menuItems: RegisteredTopNavMenuData[];

  constructor() {
    this.menuItems = [];
  }

  /**
   * @deprecated Use AppMenu from "@kbn/core-chrome-app-menu" instead
   */
  public register(menuItem: RegisteredTopNavMenuData) {
    this.menuItems.push(menuItem);
  }

  /** @internal **/
  public getAll() {
    return this.menuItems;
  }

  /** @internal **/
  public clear() {
    this.menuItems.length = 0;
  }
}

/**
 * @deprecated Use AppMenu from "@kbn/core-chrome-app-menu" instead
 */
export type TopNavMenuExtensionsRegistrySetup = Pick<TopNavMenuExtensionsRegistry, 'register'>;
