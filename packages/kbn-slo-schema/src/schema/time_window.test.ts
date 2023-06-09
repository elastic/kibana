/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Duration } from '../..';
import { DurationUnit } from '../models/duration';
import { rollingTimeWindowSchema } from './time_window';

describe('time window schema', () => {
  it('type guards correctly', () => {
    expect(
      rollingTimeWindowSchema.is({ duration: new Duration(1, DurationUnit.Month), type: 'rolling' })
    ).toBe(true);
    expect(
      rollingTimeWindowSchema.is({
        duration: new Duration(1, DurationUnit.Month),
        type: 'calendarAligned',
      })
    ).toBe(false);
  });
});
