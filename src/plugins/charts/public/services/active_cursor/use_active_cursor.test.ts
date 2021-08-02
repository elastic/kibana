/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { renderHook } from '@testing-library/react-hooks';
import type { RefObject } from 'react';

import { ActiveCursor } from './active_cursor';
import { useActiveCursor } from './use_active_cursor';

import type { ActiveCursorSyncOption, ActiveCursorPayload } from './types';
import type { Chart, PointerEvent } from '@elastic/charts';
import { Datatable } from '../../../../expressions';

describe('useActiveCursor', () => {
  let cursor: ActiveCursorPayload['cursor'];
  let dispatchExternalPointerEvent: jest.Mock;

  const act = (syncOption: ActiveCursorSyncOption, events: Array<Partial<ActiveCursorPayload>>) =>
    new Promise((resolve) => {
      const activeCursor = new ActiveCursor();

      activeCursor.setup();

      dispatchExternalPointerEvent.mockImplementation((pointerEvent) => {
        resolve(pointerEvent);
      });

      renderHook(() =>
        useActiveCursor(
          activeCursor,
          {
            current: {
              dispatchExternalPointerEvent: dispatchExternalPointerEvent as (
                pointerEvent: PointerEvent
              ) => void,
            },
          } as RefObject<Chart>,
          syncOption
        )
      );

      events.forEach((event) => {
        activeCursor.activeCursor$!.next({ cursor, ...event });
      });
    });

  beforeEach(() => {
    cursor = {} as ActiveCursorPayload['cursor'];
    dispatchExternalPointerEvent = jest.fn();
  });

  test('should trigger cursor pointer update (chart type: time, event type: time)', async () => {
    await act({ isDateHistogram: true }, [{ isDateHistogram: true }]);

    expect(dispatchExternalPointerEvent).toHaveBeenCalledTimes(1);
  });

  test('should trigger cursor pointer update (chart type: datatable - time based, event type: time)', async () => {
    await act(
      {
        datatables: ([
          {
            columns: [
              {
                meta: {
                  index: 'foo_index',
                  field: 'foo_field',
                  sourceParams: {
                    appliedTimeRange: {},
                  },
                },
              },
            ],
          },
        ] as unknown) as Datatable[],
      },
      [{ isDateHistogram: true }, { accessors: ['foo_index:foo_field'] }]
    );

    expect(dispatchExternalPointerEvent).toHaveBeenCalledTimes(2);
  });

  test('should not trigger cursor pointer update (chart type: datatable, event type: time)', async () => {
    await act(
      {
        datatables: [
          {
            columns: [
              {
                meta: {
                  index: 'foo_index',
                  field: 'foo_field',
                },
              },
            ],
          },
        ] as Datatable[],
      },
      [{ isDateHistogram: true }, { accessors: ['foo_index:foo_field'] }]
    );

    expect(dispatchExternalPointerEvent).toHaveBeenCalledTimes(1);
  });

  test('should works with multi datatables (intersection)', async () => {
    await act(
      {
        datatables: [
          {
            columns: [
              {
                meta: {
                  index: 'ia',
                  field: 'fa',
                },
              },
            ],
          },
          {
            columns: [
              {
                meta: {
                  index: 'ib',
                  field: 'fb',
                },
              },
            ],
          },
        ] as Datatable[],
      },
      [{ accessors: ['foo_index:foo_field', 'ib:fb'] }]
    );

    expect(dispatchExternalPointerEvent).toHaveBeenCalledTimes(1);
  });
});
