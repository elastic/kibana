/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { SeriesTypes } from './constants';

/**
 * Returns true when the XY subtype belongs to the bar family.
 */
export const isBarSeriesType = (seriesType: string | null | undefined) => {
  switch (seriesType) {
    case SeriesTypes.BAR:
    case SeriesTypes.BAR_STACKED:
    case SeriesTypes.BAR_PERCENTAGE_STACKED:
    case SeriesTypes.BAR_HORIZONTAL:
    case SeriesTypes.BAR_HORIZONTAL_STACKED:
    case SeriesTypes.BAR_HORIZONTAL_PERCENTAGE_STACKED:
      return true;
    default:
      return false;
  }
};
