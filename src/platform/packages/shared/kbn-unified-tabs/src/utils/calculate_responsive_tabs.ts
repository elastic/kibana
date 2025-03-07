/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { TabItem, TabsSizeConfig } from '../types';

const PLUS_BUTTON_SPACE = 24 + 8; // button width + gap
const MAX_TAB_WIDTH = 280;
const MIN_TAB_WIDTH = 96;

interface GetTabsSizeConfigProps {
  items: TabItem[];
  containerWidth: number | undefined;
  hasReachedMaxItemsCount?: boolean;
}

export const calculateResponsiveTabs = ({
  items,
  containerWidth,
  hasReachedMaxItemsCount,
}: GetTabsSizeConfigProps): TabsSizeConfig => {
  const availableContainerWidth =
    (containerWidth || window.innerWidth) - (hasReachedMaxItemsCount ? 0 : PLUS_BUTTON_SPACE);

  let calculatedTabWidth =
    items.length > 0 ? availableContainerWidth / items.length : MAX_TAB_WIDTH;

  if (calculatedTabWidth > MAX_TAB_WIDTH) {
    calculatedTabWidth = MAX_TAB_WIDTH;
  } else if (calculatedTabWidth < MIN_TAB_WIDTH) {
    calculatedTabWidth = MIN_TAB_WIDTH;
  }

  return {
    isRegularTabLimitedInWidth: calculatedTabWidth <= MAX_TAB_WIDTH,
    regularTabMaxWidth: calculatedTabWidth,
    regularTabMinWidth: MIN_TAB_WIDTH,
  };
};
