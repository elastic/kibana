/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { getAxisLabelString } from './get_axis_label_string';

describe('getAxisLabelString(interval)', () => {
  test('should return a valid label for 10 seconds', () => {
    expect(getAxisLabelString(10000)).toEqual('per 10 seconds');
  });
  test('should return a valid label for 2 minutes', () => {
    expect(getAxisLabelString(120000)).toEqual('per 2 minutes');
  });
  test('should return a valid label for 2 hour', () => {
    expect(getAxisLabelString(7200000)).toEqual('per 2 hours');
  });
});
