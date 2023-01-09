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

// TODO make sure this is a functional test

// test('Removing custom time range from badge resets embeddable back to container time', async () => {
//   const container = new TimeRangeContainer(
//     {
//       timeRange: { from: 'now-15m', to: 'now' },
//       panels: {
//         '1': {
//           type: TIME_RANGE_EMBEDDABLE,
//           explicitInput: {
//             id: '1',
//             timeRange: { from: '1', to: '2' },
//           },
//         },
//         '2': {
//           type: TIME_RANGE_EMBEDDABLE,
//           explicitInput: {
//             id: '2',
//           },
//         },
//       },
//       id: '123',
//     },
//     () => undefined
//   );

//   await container.untilEmbeddableLoaded('1');
//   await container.untilEmbeddableLoaded('2');

//   const child1 = container.getChild<TimeRangeEmbeddable>('1');
//   const child2 = container.getChild<TimeRangeEmbeddable>('2');

//   const openModalMock = jest.fn();
//   openModalMock.mockReturnValue({ close: jest.fn() });

//   new CustomTimeRangeBadge(
//     overlayServiceMock.createStartContract(),
//     themeServiceMock.createStartContract(),
//     [],
//     'MM YYYY'
//   ).execute({
//     embeddable: child1,
//   });

//   await nextTick();
//   const openModal = openModalMock.mock.calls[0][0] as ReactElement;

//   const wrapper = mount(openModal);
//   findTestSubject(wrapper, 'removePerPanelTimeRangeButton').simulate('click');

//   const promise = Rx.merge(child1.getInput$(), container.getOutput$(), container.getInput$())
//     .pipe(skip(4), take(1))
//     .toPromise();

//   container.updateInput({ timeRange: { from: 'now-10m', to: 'now-5m' } });

//   await promise;

//   expect(child1.getInput().timeRange).toEqual({ from: 'now-10m', to: 'now-5m' });
//   expect(child2.getInput().timeRange).toEqual({ from: 'now-10m', to: 'now-5m' });
// });

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
