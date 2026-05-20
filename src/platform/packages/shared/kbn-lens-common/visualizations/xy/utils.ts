/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { BarSeriesTypes } from './constants';

const barSeriesTypeSet = new Set<string>(Object.values(BarSeriesTypes));

/**
 * Returns true when the XY subtype belongs to the bar family.
 */
export const isBarSeriesType = (
  seriesType: string | null | undefined
): seriesType is (typeof BarSeriesTypes)[keyof typeof BarSeriesTypes] =>
  typeof seriesType === 'string' && barSeriesTypeSet.has(seriesType);
