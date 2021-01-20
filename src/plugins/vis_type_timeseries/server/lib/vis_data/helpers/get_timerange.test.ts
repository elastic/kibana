/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import moment from 'moment';
import { getTimerange } from './get_timerange';
import { ReqFacade, VisPayload } from '../../..';

describe('getTimerange(req)', () => {
  test('should return a moment object for to and from', () => {
    const req = ({
      payload: {
        timerange: {
          min: '2017-01-01T00:00:00Z',
          max: '2017-01-01T01:00:00Z',
        },
      },
    } as unknown) as ReqFacade<VisPayload>;
    const { from, to } = getTimerange(req);

    expect(moment.isMoment(from)).toEqual(true);
    expect(moment.isMoment(to)).toEqual(true);
    expect(moment.utc('2017-01-01T00:00:00Z').isSame(from)).toEqual(true);
    expect(moment.utc('2017-01-01T01:00:00Z').isSame(to)).toEqual(true);
  });
});
