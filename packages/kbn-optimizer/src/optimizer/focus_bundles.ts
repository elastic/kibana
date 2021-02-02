/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { Bundle } from '../common';
import { filterById } from './filter_by_id';

export function focusBundles(filters: string[], bundles: Bundle[]) {
  if (!filters.length) {
    return [...bundles];
  }

  const queue = new Set<Bundle>(filterById(filters, bundles));
  const focused: Bundle[] = [];

  for (const bundle of queue) {
    focused.push(bundle);

    const { explicit, implicit } = bundle.readBundleDeps();
    const depIds = [...explicit, ...implicit];
    if (depIds.length) {
      for (const dep of filterById(depIds, bundles)) {
        queue.add(dep);
      }
    }
  }

  return focused;
}
