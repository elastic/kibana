/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { renderHook } from '@testing-library/react-hooks';
import { useMemorizedDateRange } from './use_memorized_date_range';

describe('UnifiedFieldList useMemorizedDateRange()', () => {
  it('should work correctly for a date range', async () => {
    const { result, rerender } = renderHook(useMemorizedDateRange, {
      initialProps: {
        from: '2022-11-09T12:33:08.143Z',
        to: '2022-11-09T12:48:08.143Z',
      },
    });

    const dateRange1 = result.current;
    expect(dateRange1).toMatchInlineSnapshot(`
      Object {
        "from": "2022-11-09T12:33:00.000Z",
        "to": "2022-11-09T12:48:59.999Z",
      }
    `);

    // changing milliseconds
    rerender({
      from: '2022-11-09T12:33:18.143Z',
      to: '2022-11-09T12:48:18.143Z',
    });

    const dateRange2 = result.current;
    expect(dateRange2).toMatchInlineSnapshot(`
      Object {
        "from": "2022-11-09T12:33:00.000Z",
        "to": "2022-11-09T12:48:59.999Z",
      }
    `);

    expect(dateRange1).toBe(dateRange2);

    // changing minutes
    rerender({
      from: '2022-11-09T12:43:18.143Z',
      to: '2022-11-09T12:58:18.143Z',
    });

    const dateRange3 = result.current;
    expect(dateRange3).toMatchInlineSnapshot(`
      Object {
        "from": "2022-11-09T12:43:00.000Z",
        "to": "2022-11-09T12:58:59.999Z",
      }
    `);

    expect(dateRange1).toBe(dateRange2);
    expect(dateRange1).not.toBe(dateRange3);
  });
});
