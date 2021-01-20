/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { filter } from 'lodash';
import { Filter, compareFilters, COMPARE_ALL_OPTIONS } from '../../../../common';

const isEnabled = (f: Filter) => f && f.meta && !f.meta.disabled;

/**
 * Checks to see if only disabled filters have been changed
 *
 * @returns {bool} Only disabled filters
 */
export const onlyDisabledFiltersChanged = (newFilters?: Filter[], oldFilters?: Filter[]) => {
  // If it's the same - compare only enabled filters
  const newEnabledFilters = filter(newFilters || [], isEnabled);
  const oldEnabledFilters = filter(oldFilters || [], isEnabled);

  return compareFilters(oldEnabledFilters, newEnabledFilters, COMPARE_ALL_OPTIONS);
};
