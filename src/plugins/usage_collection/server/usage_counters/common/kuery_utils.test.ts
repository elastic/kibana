/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { fromKueryExpression } from '@kbn/es-query';
import { usageCountersSearchParamsToKueryFilter } from './kuery_utils';
import type { UsageCountersSearchFilters } from '../types';

describe('usageCountersSearchParamsToKueryFilter', () => {
  it('creates a Kuery function with the provided search arguments', () => {
    const params: Omit<UsageCountersSearchFilters, 'namespace'> = {
      domainId: 'foo',
      counterName: 'bar',
      counterType: 'count',
      source: 'server',
      from: '2024-07-03T10:00:00.000Z',
      to: '2024-07-10T10:00:00.000Z',
    };
    const fromParams = usageCountersSearchParamsToKueryFilter(params);

    const fromExpression = fromKueryExpression(
      // We need to pass the SO type (+ attributes)
      // This is handled (removed) by the SOR internally
      [
        `usage-counter.attributes.domainId: ${params.domainId}`,
        `usage-counter.attributes.counterName: ${params.counterName}`,
        `usage-counter.attributes.counterType: ${params.counterType}`,
        `usage-counter.attributes.source: ${params.source}`,
        `usage-counter.updated_at >= "${params.from}"`,
        `usage-counter.updated_at <= "${params.to}"`,
      ].join(' AND ')
    );

    // hack Kuery expression, as we cannot unquote date params above
    fromExpression.arguments[4].arguments[2].isQuoted = false;
    fromExpression.arguments[5].arguments[2].isQuoted = false;

    expect(fromParams).toEqual(fromExpression);

    expect(fromParams).toMatchInlineSnapshot(`
      Object {
        "arguments": Array [
          Object {
            "arguments": Array [
              Object {
                "isQuoted": false,
                "type": "literal",
                "value": "usage-counter.attributes.domainId",
              },
              Object {
                "isQuoted": false,
                "type": "literal",
                "value": "foo",
              },
            ],
            "function": "is",
            "type": "function",
          },
          Object {
            "arguments": Array [
              Object {
                "isQuoted": false,
                "type": "literal",
                "value": "usage-counter.attributes.counterName",
              },
              Object {
                "isQuoted": false,
                "type": "literal",
                "value": "bar",
              },
            ],
            "function": "is",
            "type": "function",
          },
          Object {
            "arguments": Array [
              Object {
                "isQuoted": false,
                "type": "literal",
                "value": "usage-counter.attributes.counterType",
              },
              Object {
                "isQuoted": false,
                "type": "literal",
                "value": "count",
              },
            ],
            "function": "is",
            "type": "function",
          },
          Object {
            "arguments": Array [
              Object {
                "isQuoted": false,
                "type": "literal",
                "value": "usage-counter.attributes.source",
              },
              Object {
                "isQuoted": false,
                "type": "literal",
                "value": "server",
              },
            ],
            "function": "is",
            "type": "function",
          },
          Object {
            "arguments": Array [
              Object {
                "isQuoted": false,
                "type": "literal",
                "value": "usage-counter.updated_at",
              },
              "gte",
              Object {
                "isQuoted": false,
                "type": "literal",
                "value": "2024-07-03T10:00:00.000Z",
              },
            ],
            "function": "range",
            "type": "function",
          },
          Object {
            "arguments": Array [
              Object {
                "isQuoted": false,
                "type": "literal",
                "value": "usage-counter.updated_at",
              },
              "lte",
              Object {
                "isQuoted": false,
                "type": "literal",
                "value": "2024-07-10T10:00:00.000Z",
              },
            ],
            "function": "range",
            "type": "function",
          },
        ],
        "function": "and",
        "type": "function",
      }
    `);
  });
});
