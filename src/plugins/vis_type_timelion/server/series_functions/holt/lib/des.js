/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import _ from 'lodash';

export default function des(points, alpha, beta) {
  let level;
  let prevLevel;
  let trend;
  let prevTrend;
  let unknownCount = 0;

  if (points.length < 2) {
    throw new Error(
      i18n.translate('timelion.serverSideErrors.holtFunction.notEnoughPointsErrorMessage', {
        defaultMessage: 'You need at least 2 points to use double exponential smoothing',
      })
    );
  }

  const smoothedPoints = _.map(
    points,
    (point, i) => {
      if (i === 0) {
        return point;
      }

      if (i === 1) {
        // Establish initial values for level and trend;
        level = points[0];
        trend = points[1] - points[0]; // This is sort of a lame way to do this
      }

      if (point == null) {
        unknownCount++;
      } else {
        unknownCount = 0;
        // These 2 variables are not required, but are used for clarity.
        prevLevel = level;
        prevTrend = trend;
        level = alpha * point + (1 - alpha) * (prevLevel + prevTrend);
        trend = beta * (level - prevLevel) + (1 - beta) * prevTrend;
      }

      return level + unknownCount * trend;
    },
    []
  );

  return smoothedPoints;
}
