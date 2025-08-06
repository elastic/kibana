/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { TabItem } from '../types';

export const getNextTabNumber = (allTabs: TabItem[], baseLabel: string) => {
  // Find all tabs that start with the base label
  const numbers = allTabs
    .map((tab) => tab.label.trim())
    .filter((label) => label === baseLabel || label.startsWith(`${baseLabel} `))
    .map((label) => {
      if (label === baseLabel) return 1; // First occurrence has implicit number 1

      // Extract number from "Base Label X" format
      const suffix = label.slice(baseLabel.length + 1);
      const num = Number(suffix);
      return isNaN(num) ? null : num;
    })
    .filter((num): num is number => num !== null);

  return numbers.length > 0 ? Math.max(...numbers) + 1 : null;
};
