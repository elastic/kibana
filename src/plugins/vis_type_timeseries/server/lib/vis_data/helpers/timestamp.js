/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { last } from 'lodash';

/**
 * @param {Array} seriesGroup
 * [
 *  [
 *    {
 *      data: [
 *        [1555189200000, 12],
 *        [1555191100000, 42],
 *        [1555263300000, 95],
 *        ...coordinates,
 *      ]
 *      ...properties,
 *    }
 *    ...series,
 *  ]
 *  ...seriesGroups,
 * ]
 * @return {number} lastTimestamp
 */
export function getLastSeriesTimestamp(seriesGroup = []) {
  let lastTimestamp = null;

  seriesGroup.forEach((series) => {
    series.forEach(({ data }) => {
      const [dataLastTimestamp] = last(data);

      lastTimestamp = Math.max(lastTimestamp, dataLastTimestamp);
    });
  });

  return lastTimestamp;
}
