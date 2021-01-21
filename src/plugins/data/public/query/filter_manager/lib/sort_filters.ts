/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { Filter, FilterStateStore } from '../../../../common';

/**
 * Sort filters according to their store - global filters go first
 *
 * @param {object} first The first filter to compare
 * @param {object} second The second filter to compare
 *
 * @returns {number} Sorting order of filters
 */
export const sortFilters = ({ $state: a }: Filter, { $state: b }: Filter): number => {
  if (a!.store === b!.store) {
    return 0;
  } else {
    return a!.store === FilterStateStore.GLOBAL_STATE && b!.store !== FilterStateStore.GLOBAL_STATE
      ? -1
      : 1;
  }
};
