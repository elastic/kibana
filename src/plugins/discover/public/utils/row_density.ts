/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Storage } from '../../../kibana_utils/public';

export type RowDensity = 'compact' | 'normal' | 'expanded';

const DENSITY_KEY = 'discover:dataGridRowDensity';
const ROW_DENSITY = ['compact', 'normal', 'expanded'];

export const updateStoredDensity = (newRowDensity: RowDensity, storage: Storage) => {
  storage.set(DENSITY_KEY, newRowDensity);
};

export const getStoredRowDensity = (storage: Storage): RowDensity | null => {
  const density = storage.get(DENSITY_KEY);
  if (density !== null && Object.values(ROW_DENSITY).includes(density)) {
    return density;
  }
  return null;
};
