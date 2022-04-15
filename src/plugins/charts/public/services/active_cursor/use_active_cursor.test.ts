/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { from, of, delay, concatMap } from 'rxjs';
import { renderHook } from '@testing-library/react-hooks';
import type { RefObject } from 'react';

import { ActiveCursor } from './active_cursor';
import { useActiveCursor } from './use_active_cursor';

import type { ActiveCursorSyncOption, ActiveCursorPayload } from './types';
import type { Chart, PointerEvent } from '@elastic/charts';
import type { Datatable } from '../../../../expressions/public';

/** @internal **/
type DispatchExternalPointerEventFn = (pointerEvent: PointerEvent) => void;

describe('useActiveCursor', () => {
  const act = async (
    syncOption: ActiveCursorSyncOption,
    events: Array<Partial<ActiveCursorPayload>>,
    eventsTimeout = 5
  ): Promise<{ dispatchExternalPointerEvent: DispatchExternalPointerEventFn }> => {
    const activeCursor = new ActiveCursor();
    const cursor = {} as ActiveCursorPayload['cursor'];
    const dispatchExternalPointerEvent: DispatchExternalPointerEventFn = jest.fn();
    const debounce = syncOption.debounce ?? 5;

    activeCursor.setup();

    renderHook(() =>
      useActiveCursor(
        activeCursor,
        {
          current: {
            dispatchExternalPointerEvent,
          },
        } as RefObject<Chart>,
        { ...syncOption, debounce }
      )
    );

    return new Promise((res, rej) =>
      from(events)
        .pipe(concatMap((x) => of(x).pipe(delay(eventsTimeout))))
        .subscribe({
          next: (item) => {
            activeCursor.activeCursor$!.next({
              cursor,
              ...item,
            });
          },
          complete: () => {
            /** We have to wait before resolving the promise to make sure the debouncedEvent gets fired.  **/
            setTimeout(() => res({ dispatchExternalPointerEvent }), eventsTimeout + debounce + 30);
          },
          error: (error) => {
            rej(error);
          },
        })
    );
  };

  test('should debounce events', async () => {
    const { dispatchExternalPointerEvent } = await act(
      {
        debounce: 10,
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
      [
        { accessors: ['foo_index:foo_field'] },
        { accessors: ['foo_index:foo_field'] },
        { accessors: ['foo_index:foo_field'] },
        { accessors: ['foo_index:foo_field'] },
      ]
    );

    expect(dispatchExternalPointerEvent).toHaveBeenCalledTimes(1);
  });

  test('should trigger cursor pointer update (chart type: time, event type: time)', async () => {
    const { dispatchExternalPointerEvent } = await act({ isDateHistogram: true }, [
      { isDateHistogram: true },
    ]);

    expect(dispatchExternalPointerEvent).toHaveBeenCalledTimes(1);
  });

  test('should trigger cursor pointer update (chart type: datatable - time based, event type: time)', async () => {
    const { dispatchExternalPointerEvent } = await act(
      {
        datatables: [
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
        ] as unknown as Datatable[],
      },
      [{ isDateHistogram: true }, { accessors: ['foo_index:foo_field'] }]
    );

    expect(dispatchExternalPointerEvent).toHaveBeenCalledTimes(2);
  });

  test('should not trigger cursor pointer update (chart type: datatable, event type: time)', async () => {
    const { dispatchExternalPointerEvent } = await act(
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
    const { dispatchExternalPointerEvent } = await act(
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
