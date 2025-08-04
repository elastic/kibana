/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { TabItem } from '../types';

export const getNextTabNumber = (
  allTabs: TabItem[],
  combinedRegex: RegExp,
  regexMatchName?: string
) => {
  const maxNumber = allTabs.reduce((max, tab) => {
    const match = tab.label.trim().match(combinedRegex);
    if (!match) return max;

    const tabNumber = regexMatchName ? match.groups?.[regexMatchName] : match[1];
    const currentNumber = tabNumber ? Number(tabNumber) : 1;
    return Math.max(max, currentNumber);
  }, 0);

  return maxNumber > 0 ? maxNumber + 1 : null;
};
