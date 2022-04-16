/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import moment from 'moment';
import splitInterval from './split_interval';

export default function (tlConfig) {
  const min = moment(tlConfig.time.from);
  const max = moment(tlConfig.time.to);

  const intervalParts = splitInterval(tlConfig.time.interval);

  let current = min.startOf(intervalParts.unit);

  const targetSeries = [];

  while (current.valueOf() < max.valueOf()) {
    targetSeries.push(current.valueOf());
    current = current.add(intervalParts.count, intervalParts.unit);
  }

  return targetSeries;
}
