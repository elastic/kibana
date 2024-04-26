/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { AggregateOfMap } from './search';

xdescribe('AggregateOfMap', () => {
  test('aggregations should assume buckets are there if type is explicit', () => {
    type MyAggregation = {} & {
      group_by: {
        terms: unknown;
      };
    };

    const aggregation = {} as unknown as AggregateOfMap<MyAggregation, unknown>;
    aggregation.group_by.buckets.length.toFixed(); // using a number-specific method
  });

  test('aggregations should not assume buckets are there if the aggregation may be undefined', () => {
    type MyAggregation =
      | undefined
      | ({} & {
          group_by: {
            terms: unknown;
          };
        });

    const aggregation = {} as unknown as AggregateOfMap<MyAggregation, unknown>;
    aggregation?.group_by.buckets.length.toFixed(); // using a number-specific method
    // @ts-expect-error "aggregation" may be undefined
    aggregation.group_by.buckets.length.toFixed(); // using a number-specific method
  });

  test('aggregations should not assume buckets are there if the bucket name may be undefined', () => {
    type MyAggregation =
      | {} & {
          group_by?: {
            terms: unknown;
          };
        };

    const aggregation = {} as unknown as AggregateOfMap<MyAggregation, unknown>;
    aggregation.group_by?.buckets.length.toFixed(); // using a number-specific method
    // @ts-expect-error "group_by" may be undefined
    aggregation.group_by.buckets.length.toFixed(); // using a number-specific method
  });
});
