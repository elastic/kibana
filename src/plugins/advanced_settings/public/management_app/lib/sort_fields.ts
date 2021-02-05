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

// TODO: test
export const fieldSorter = (a: FieldSetting, b: FieldSetting): number => {
  const aOrder = a.order !== undefined;
  const bOrder = b.order !== undefined;
  if (aOrder && bOrder) {
    return cmp(a.order, b.order);
  } else if (aOrder) {
    return -1;
  } else if (bOrder) {
    return 1;
  } else {
    return cmp(a.name, b.name);
  }
};
