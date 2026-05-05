/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { transformTimeRangeOut } from './time_range_transforms';

describe('transformTimeRangeOut', () => {
  it('should transform legacy timeRange to time_range', () => {
    expect(transformTimeRangeOut({ timeRange: { from: 'now-90d', to: 'now' } }))
      .toMatchInlineSnapshot(`
      Object {
        "time_range": Object {
          "from": "now-90d",
          "to": "now",
        },
      }
    `);
  });

  it('should preserve time_range over timeRange when both are present', () => {
    expect(
      transformTimeRangeOut({
        timeRange: { from: 'now-90d', to: 'now' },
        time_range: { from: 'now-7d', to: 'now' },
      })
    ).toMatchInlineSnapshot(`
      Object {
        "time_range": Object {
          "from": "now-7d",
          "to": "now",
        },
      }
    `);
  });

  it('should return time_range when only time_range is present', () => {
    expect(transformTimeRangeOut({ time_range: { from: 'now-7d', to: 'now' } }))
      .toMatchInlineSnapshot(`
      Object {
        "time_range": Object {
          "from": "now-7d",
          "to": "now",
        },
      }
    `);
  });

  it('should preserve all non-time-range properties', () => {
    expect(
      transformTimeRangeOut({
        timeRange: { from: 'now-90d', to: 'now' },
        foo: 'woo',
        woo: 'foo',
      })
    ).toMatchInlineSnapshot(`
      Object {
        "foo": "woo",
        "time_range": Object {
          "from": "now-90d",
          "to": "now",
        },
        "woo": "foo",
      }
    `);
  });
});
