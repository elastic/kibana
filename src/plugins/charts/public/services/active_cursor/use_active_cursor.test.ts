/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { TestScheduler } from 'rxjs/testing';
import { renderHook } from '@testing-library/react-hooks';
import type { Chart, PointerEvent } from '@elastic/charts';
import type { Datatable } from '@kbn/expressions-plugin/public';
import type { RefObject } from 'react';

import type { ActiveCursor } from './active_cursor';
import { useActiveCursor } from './use_active_cursor';

import type { ActiveCursorSyncOption, ActiveCursorPayload } from './types';

/** @internal **/
type DispatchExternalPointerEventFn = (pointerEvent: PointerEvent) => void;

describe('useActiveCursor', () => {
  let testScheduler: TestScheduler;

  beforeEach(() => {
    testScheduler = new TestScheduler((actual, expected) => expect(actual).toEqual(expected));
  });

  const act = async (
    syncOption: ActiveCursorSyncOption,
    events: Record<string, Partial<ActiveCursorPayload>>
  ): Promise<{ dispatchExternalPointerEvent: DispatchExternalPointerEventFn }> => {
    const dispatchExternalPointerEvent: DispatchExternalPointerEventFn = jest.fn();

    return new Promise((res) => {
      testScheduler.run(({ cold }) => {
        const marble = `${Object.keys(events).join(`-`)} |`;
        const activeCursor$ = cold(marble, events);

        renderHook(() =>
          useActiveCursor(
            {
              activeCursor$,
            } as unknown as ActiveCursor,
            {
              current: {
                dispatchExternalPointerEvent,
              },
            } as RefObject<Chart>,
            { ...syncOption, debounce: syncOption.debounce ?? 1 }
          )
        );

        activeCursor$.subscribe({
          complete: () => {
            res({ dispatchExternalPointerEvent });
          },
        });
      });
    });
  };

  test('should debounce events', async () => {
    const { dispatchExternalPointerEvent } = await act(
      {
        debounce: 5,
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
      {
        a: { accessors: ['foo_index:foo_field'] },
        b: { accessors: ['foo_index:foo_field'] },
        c: { accessors: ['foo_index:foo_field'] },
        d: { accessors: ['foo_index:foo_field'] },
      }
    );

    expect(dispatchExternalPointerEvent).toHaveBeenCalledTimes(1);
  });

  test('should trigger cursor pointer update (chart type: time, event type: time)', async () => {
    const { dispatchExternalPointerEvent } = await act(
      { isDateHistogram: true },
      {
        a: { isDateHistogram: true },
      }
    );

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
      { a: { isDateHistogram: true }, b: { accessors: ['foo_index:foo_field'] } }
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
      { a: { isDateHistogram: true }, b: { accessors: ['foo_index:foo_field'] } }
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
      { a: { accessors: ['foo_index:foo_field', 'ib:fb'] } }
    );

    expect(dispatchExternalPointerEvent).toHaveBeenCalledTimes(1);
  });
});
