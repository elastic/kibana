/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { overlayServiceMock } from '@kbn/core-overlays-browser-mocks';
import { themeServiceMock } from '@kbn/core-theme-browser-mocks';
import {
  TimeRangeEmbeddable,
  TimeRangeContainer,
  TIME_RANGE_EMBEDDABLE,
} from '../../../../test_samples/embeddables';
import { CustomTimeRangeBadge } from './custom_time_range_badge';

test(`badge is not compatible with embeddable that inherits from parent`, async () => {
  const container = new TimeRangeContainer(
    {
      timeRange: { from: 'now-15m', to: 'now' },
      panels: {
        '1': {
          type: TIME_RANGE_EMBEDDABLE,
          explicitInput: {
            id: '1',
          },
        },
      },
      id: '123',
    },
    () => undefined
  );

  await container.untilEmbeddableLoaded('1');

  const child = container.getChild<TimeRangeEmbeddable>('1');

  const compatible = await new CustomTimeRangeBadge(
    overlayServiceMock.createStartContract(),
    themeServiceMock.createStartContract(),
    [],
    'MM YYYY'
  ).isCompatible({
    embeddable: child,
  });
  expect(compatible).toBe(false);
});

test(`badge is compatible with embeddable that has custom time range`, async () => {
  const container = new TimeRangeContainer(
    {
      timeRange: { from: 'now-15m', to: 'now' },
      panels: {
        '1': {
          type: TIME_RANGE_EMBEDDABLE,
          explicitInput: {
            id: '1',
            timeRange: { to: '123', from: '456' },
          },
        },
      },
      id: '123',
    },
    () => undefined
  );

  await container.untilEmbeddableLoaded('1');

  const child = container.getChild<TimeRangeEmbeddable>('1');

  const compatible = await new CustomTimeRangeBadge(
    overlayServiceMock.createStartContract(),
    themeServiceMock.createStartContract(),
    [],
    'MM YYYY'
  ).isCompatible({
    embeddable: child,
  });
  expect(compatible).toBe(true);
});

test('Attempting to execute on incompatible embeddable throws an error', async () => {
  const container = new TimeRangeContainer(
    {
      timeRange: { from: 'now-15m', to: 'now' },
      panels: {
        '1': {
          type: TIME_RANGE_EMBEDDABLE,
          explicitInput: {
            id: '1',
          },
        },
      },
      id: '123',
    },
    () => undefined
  );

  await container.untilEmbeddableLoaded('1');

  const child = container.getChild<TimeRangeEmbeddable>('1');

  const badge = await new CustomTimeRangeBadge(
    overlayServiceMock.createStartContract(),
    themeServiceMock.createStartContract(),
    [],
    'MM YYYY'
  );

  async function check() {
    await badge.execute({ embeddable: child });
  }
  await expect(check()).rejects.toThrow(Error);
});
