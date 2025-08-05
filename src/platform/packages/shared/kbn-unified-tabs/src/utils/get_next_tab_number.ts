/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { TabItem } from '../types';

export const getNextTabNumber = (allTabs: TabItem[], regex: RegExp) => {
  const result = allTabs.reduce(
    (acc, tab) => {
      const match = tab.label.trim().match(regex);

      if (!match) return acc;

      const currentNumber = match[1] ? Number(match[1]) : 1;
      return {
        hasMatch: true,
        maxNumber: Math.max(acc.maxNumber, currentNumber),
      };
    },
    { hasMatch: false, maxNumber: 0 }
  );

  return result.hasMatch ? result.maxNumber + 1 : null;
};
