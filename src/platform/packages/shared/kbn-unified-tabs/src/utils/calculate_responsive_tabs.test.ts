/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { calculateResponsiveTabs, PLUS_BUTTON_SPACE } from './calculate_responsive_tabs';
import { getNewTabPropsForIndex } from '../hooks/use_new_tab_props';
import { MAX_TAB_WIDTH, MIN_TAB_WIDTH } from '../constants';

function generateItems(count: number) {
  return Array.from({ length: count }).map((_, i) => getNewTabPropsForIndex(i));
}
const items = generateItems(5);

describe('calculateResponsiveTabs', () => {
  it('renders a single tab without limitation', () => {
    const tabsSizeConfig = calculateResponsiveTabs({ items: [items[0]], containerWidth: 1500 });

    expect(tabsSizeConfig).toEqual({
      isScrollable: false,
      regularTabMaxWidth: MAX_TAB_WIDTH,
      regularTabMinWidth: MIN_TAB_WIDTH,
    });
  });

  it('allows the larger the tab width', () => {
    const tabsSizeConfig = calculateResponsiveTabs({ items, containerWidth: 1500 });

    expect(tabsSizeConfig).toEqual({
      isScrollable: false,
      regularTabMaxWidth: MAX_TAB_WIDTH,
      regularTabMinWidth: MIN_TAB_WIDTH,
    });
  });

  it('reduces the tab width if not enough space', () => {
    const tabsSizeConfig = calculateResponsiveTabs({ items, containerWidth: 1000 });

    expect(tabsSizeConfig).toEqual({
      isScrollable: false,
      regularTabMaxWidth: 193.6,
      regularTabMinWidth: MIN_TAB_WIDTH,
    });
  });

  it('reduces the tab width to the minimum if not enough space', () => {
    const tabsSizeConfig = calculateResponsiveTabs({ items, containerWidth: 500 });

    expect(tabsSizeConfig).toEqual({
      isScrollable: true,
      regularTabMaxWidth: MIN_TAB_WIDTH,
      regularTabMinWidth: MIN_TAB_WIDTH,
    });
  });

  it('returns reasonable sizes even when the available space is unknown', () => {
    const tabsSizeConfig = calculateResponsiveTabs({
      items: [items[0]],
      containerWidth: undefined,
    });

    expect(tabsSizeConfig).toEqual({
      isScrollable: false,
      regularTabMaxWidth: MAX_TAB_WIDTH,
      regularTabMinWidth: MIN_TAB_WIDTH,
    });
  });

  it('returns reasonable sizes when the available space is enough to fit all tabs with float-precision width', () => {
    const numberOfItems = 7;
    const containerWidth = 1310;
    const tabsSizeConfig = calculateResponsiveTabs({
      items: generateItems(numberOfItems),
      containerWidth,
    });

    expect(tabsSizeConfig).toEqual({
      isScrollable: false, // the test checks that all tabs are fitting the container and no scroll is needed
      regularTabMaxWidth: (containerWidth - PLUS_BUTTON_SPACE) / numberOfItems,
      regularTabMinWidth: MIN_TAB_WIDTH,
    });
  });
});
