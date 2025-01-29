/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import moment from 'moment';
import { VisTypeTimeseriesVisDataRequest } from '../../../types';
import { getTimerange } from './get_timerange';

describe('getTimerange(req)', () => {
  test('should return a moment object for to and from', () => {
    const req = {
      body: {
        timerange: {
          min: '2017-01-01T00:00:00Z',
          max: '2017-01-01T01:00:00Z',
        },
      },
    } as unknown as VisTypeTimeseriesVisDataRequest;
    const { from, to } = getTimerange(req);

    expect(moment.isMoment(from)).toEqual(true);
    expect(moment.isMoment(to)).toEqual(true);
    expect(moment.utc('2017-01-01T00:00:00Z').isSame(from)).toEqual(true);
    expect(moment.utc('2017-01-01T01:00:00Z').isSame(to)).toEqual(true);
  });
});
