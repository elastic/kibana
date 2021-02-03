/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { orderXValues } from './ordered_x_keys';
import { createZeroFilledArray } from './zero_filled_array';
import { zeroFillDataArray } from './zero_fill_data_array';

/*
 * A Kibana data object may have multiple series with different array lengths.
 * This proves an impediment to stacking in the visualization library.
 * Therefore, zero values must be injected wherever these arrays do not line up.
 * That is, each array must have the same x values with zeros filled in where the
 * x values were added.
 *
 * This function and its helper functions accepts a Kibana data object
 * and injects zeros where needed.
 */

export function injectZeros(obj, data, orderBucketsBySum = false) {
  const keys = orderXValues(data, orderBucketsBySum);

  obj.forEach(function (series) {
    const zeroArray = createZeroFilledArray(keys, series.label);
    series.values = zeroFillDataArray(zeroArray, series.values);
  });

  return obj;
}
