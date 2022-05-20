/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { canInheritTimeRange } from './can_inherit_time_range';
import { HelloWorldContainer } from '@kbn/embeddable-plugin/public/lib/test_samples';
import { HelloWorldEmbeddable } from '@kbn/embeddable-plugin/public/tests/fixtures';
import { TimeRangeEmbeddable, TimeRangeContainer } from './test_helpers';

test('canInheritTimeRange returns false if embeddable is inside container without a time range', () => {
  const embeddable = new TimeRangeEmbeddable(
    { id: '1234', timeRange: { from: 'noxw-15m', to: 'now' } },
    new HelloWorldContainer({ id: '123', panels: {} }, {})
  );

  expect(canInheritTimeRange(embeddable)).toBe(false);
});

test('canInheritTimeRange returns false if embeddable is without a time range', () => {
  const embeddable = new HelloWorldEmbeddable(
    { id: '1234' },
    new HelloWorldContainer({ id: '123', panels: {} }, {})
  );
  // @ts-ignore
  expect(canInheritTimeRange(embeddable)).toBe(false);
});

test('canInheritTimeRange returns true if embeddable is inside a container with a time range', () => {
  const embeddable = new TimeRangeEmbeddable(
    { id: '1234', timeRange: { from: 'noxw-15m', to: 'now' } },
    new TimeRangeContainer(
      { id: '123', panels: {}, timeRange: { from: 'noxw-15m', to: 'now' } },
      () => undefined
    )
  );
  expect(canInheritTimeRange(embeddable)).toBe(true);
});
