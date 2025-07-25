/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Measures the actual height of menu items by querying existing DOM elements
 * @param menuElement - The menu element containing the items
 */
export const getActualItemHeights = (menuElement: HTMLElement): number[] => {
  const menuItems = menuElement.querySelectorAll('[data-menu-item]');
  const heights: number[] = [];

  menuItems.forEach((item) => {
    const rect = item.getBoundingClientRect();
    heights.push(rect.height);
  });

  return heights;
};
