/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { convertToMovingAverageParams } from './moving_average';
import { Metric } from '../../../../common/types';
import { TSVB_METRIC_TYPES } from '../../../../common/enums';
import { MovingAverageParams } from '@kbn/visualizations-plugin/common/convert_to_lens';

describe('convertToMovingAverageParams', () => {
  const metric: Metric = {
    id: 'some-id',
    type: TSVB_METRIC_TYPES.MOVING_AVERAGE,
  };
  const window = 10;

  test.each<[string, Parameters<typeof convertToMovingAverageParams>, MovingAverageParams]>([
    ['params with default window if no window is specified in metric', [metric], { window: 5 }],
    ['params with window', [{ ...metric, window }], { window }],
  ])('should return %s', (_, input, expected) => {
    expect(convertToMovingAverageParams(...input)).toEqual(expect.objectContaining(expected));
  });
});
