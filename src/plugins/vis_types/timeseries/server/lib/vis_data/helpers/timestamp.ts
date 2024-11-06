/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { last } from 'lodash';
import { PanelSeries } from '../../../../common/types/vis_data';

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
export function getLastSeriesTimestamp(seriesGroup: Array<PanelSeries['series']> = []) {
  let lastTimestamp: number | undefined;

  seriesGroup.forEach((series) => {
    series.forEach(({ data }) => {
      const lastValue = last(data);

      if (lastValue) {
        const [dataLastTimestamp] = lastValue;

        if (typeof dataLastTimestamp === 'number') {
          lastTimestamp = Math.max(dataLastTimestamp, lastTimestamp ?? dataLastTimestamp);
        }
      }
    });
  });

  return lastTimestamp;
}
