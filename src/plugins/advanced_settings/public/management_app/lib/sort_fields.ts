/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Comparators } from '@elastic/eui';
import { FieldSetting } from '../types';

const cmp = Comparators.default('asc');

export const fieldSorter = (a: FieldSetting, b: FieldSetting): number => {
  const aOrder = a.order !== undefined;
  const bOrder = b.order !== undefined;

  if (aOrder && bOrder) {
    if (a.order === b.order) {
      return cmp(a.name, b.name);
    }
    return cmp(a.order, b.order);
  }
  if (aOrder) {
    return -1;
  }
  if (bOrder) {
    return 1;
  }
  return cmp(a.name, b.name);
};
