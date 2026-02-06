/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { TabItem, TabsSizeConfig } from '../types';
import { MAX_TAB_WIDTH, MIN_TAB_WIDTH } from '../constants';

export const PLUS_BUTTON_SPACE = 24 + 8; // button width + gap

interface GetTabsSizeConfigProps {
  items: TabItem[];
  containerWidth: number | undefined;
  hasReachedMaxItemsCount?: boolean;
  horizontalGap?: number;
}

export const calculateResponsiveTabs = ({
  items,
  containerWidth,
  hasReachedMaxItemsCount,
  horizontalGap,
}: GetTabsSizeConfigProps): TabsSizeConfig => {
  const availableContainerWidth =
    (containerWidth || window.innerWidth) - (hasReachedMaxItemsCount ? 0 : PLUS_BUTTON_SPACE);

  const gapWidth = horizontalGap ?? 0;
  const gapWidthBetweenTabs = gapWidth * Math.max(items.length - 1, 0);
  const gapWidthBeforeFirstTabAndAfterLastTab = gapWidth * 2;
  const totalGapWidth = gapWidthBetweenTabs + gapWidthBeforeFirstTabAndAfterLastTab;
  const availableSpaceForTabs = Math.max(availableContainerWidth - totalGapWidth, 0);

  let wasSpaceEquallyDivided = items.length > 0;
  let calculatedTabWidth = wasSpaceEquallyDivided
    ? availableSpaceForTabs / items.length
    : MAX_TAB_WIDTH;

  if (calculatedTabWidth > MAX_TAB_WIDTH) {
    calculatedTabWidth = MAX_TAB_WIDTH;
    wasSpaceEquallyDivided = false;
  } else if (calculatedTabWidth < MIN_TAB_WIDTH) {
    calculatedTabWidth = MIN_TAB_WIDTH;
    wasSpaceEquallyDivided = false;
  }

  const numberOfVisibleItems = wasSpaceEquallyDivided
    ? items.length
    : Math.floor(availableSpaceForTabs / calculatedTabWidth);

  return {
    isScrollable: items.length > numberOfVisibleItems,
    regularTabMaxWidth: calculatedTabWidth,
    regularTabMinWidth: MIN_TAB_WIDTH,
  };
};
