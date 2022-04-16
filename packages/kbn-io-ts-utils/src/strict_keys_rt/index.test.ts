/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import * as t from 'io-ts';
import { isRight, isLeft } from 'fp-ts/lib/Either';
import { strictKeysRt } from '.';
import { jsonRt } from '../json_rt';
import { PathReporter } from 'io-ts/lib/PathReporter';

describe('strictKeysRt', () => {
  it('correctly and deeply validates object keys', () => {
    const metricQueryRt = t.union(
      [
        t.type({
          avg_over_time: t.intersection([
            t.type({
              field: t.string,
            }),
            t.partial({
              range: t.string,
            }),
          ]),
        }),
        t.type({
          count_over_time: t.strict({}),
        }),
      ],
      'metric_query'
    );

    const metricExpressionRt = t.type(
      {
        expression: t.string,
      },
      'metric_expression'
    );

    const metricRt = t.intersection([
      t.partial({
        record: t.boolean,
      }),
      t.union([metricQueryRt, metricExpressionRt]),
    ]);

    const metricContainerRt = t.record(t.string, metricRt);

    const groupingRt = t.type(
      {
        by: t.record(
          t.string,
          t.type({
            field: t.string,
          }),
          'by'
        ),
        limit: t.number,
      },
      'grouping'
    );

    const queryRt = t.intersection(
      [
        t.union([groupingRt, t.strict({})]),
        t.type({
          index: t.union([t.string, t.array(t.string)]),
          metrics: metricContainerRt,
        }),
        t.partial({
          filter: t.string,
          round: t.string,
          runtime_mappings: t.string,
          query_delay: t.string,
        }),
      ],
      'query'
    );

    const checks: Array<{ type: t.Type<any>; passes: any[]; fails: any[] }> = [
      {
        type: t.intersection([t.type({ foo: t.string }), t.partial({ bar: t.string })]),
        passes: [{ foo: '' }, { foo: '', bar: '' }],
        fails: [
          { foo: '', unknownKey: '' },
          { foo: '', bar: '', unknownKey: '' },
        ],
      },
      {
        type: t.type({
          path: t.union([t.type({ serviceName: t.string }), t.type({ transactionType: t.string })]),
        }),
        passes: [{ path: { serviceName: '' } }, { path: { transactionType: '' } }],
        fails: [
          { path: { serviceName: '', unknownKey: '' } },
          { path: { transactionType: '', unknownKey: '' } },
          { path: { serviceName: '', transactionType: '' } },
          { path: { serviceName: '' }, unknownKey: '' },
        ],
      },
      {
        type: t.intersection([
          t.type({ query: t.type({ bar: t.string }) }),
          t.partial({ query: t.partial({ _inspect: t.boolean }) }),
        ]),
        passes: [{ query: { bar: '', _inspect: true } }],
        fails: [{ query: { _inspect: true } }],
      },
      {
        type: t.type({
          body: t.intersection([
            t.partial({
              from: t.string,
            }),
            t.type({
              config: t.intersection([
                t.partial({
                  from: t.string,
                }),
                t.type({
                  alert: t.type({}),
                }),
                t.union([
                  t.type({
                    query: queryRt,
                  }),
                  t.type({
                    queries: t.array(queryRt),
                  }),
                ]),
              ]),
            }),
          ]),
        }),
        passes: [
          {
            body: {
              config: {
                alert: {},
                query: {
                  index: ['apm-*'],
                  filter: 'processor.event:transaction',
                  metrics: {
                    avg_latency_1h: {
                      avg_over_time: {
                        field: 'transaction.duration.us',
                      },
                    },
                  },
                },
              },
            },
          },
        ],
        fails: [
          {
            body: {
              config: {
                alert: {},
                query: {
                  index: '',
                  metrics: {
                    avg_latency_1h: {
                      avg_over_time: {
                        field: '',
                        range: '',
                      },
                    },
                    rate_1h: {
                      count_over_time: {
                        field: '',
                      },
                    },
                  },
                },
              },
            },
          },
        ],
      },
    ];

    checks.forEach((check) => {
      const { type, passes, fails } = check;

      const strictType = strictKeysRt(type);

      passes.forEach((value) => {
        const result = strictType.decode(value);

        if (!isRight(result)) {
          throw new Error(
            `Expected ${JSON.stringify(
              value
            )} to be allowed, but validation failed with ${PathReporter.report(result).join('\n')}`
          );
        }
      });

      fails.forEach((value) => {
        const result = strictType.decode(value);

        if (!isLeft(result)) {
          throw new Error(
            `Expected ${JSON.stringify(value)} to be disallowed, but validation succeeded`
          );
        }
      });
    });
  });

  it('does not support piped types', () => {
    const typeA = t.type({
      query: t.type({ filterNames: jsonRt.pipe(t.array(t.string)) }),
    } as Record<string, any>);

    const typeB = t.partial({
      query: t.partial({ _inspect: jsonRt.pipe(t.boolean) }),
    });

    const value = {
      query: {
        _inspect: 'true',
        filterNames: JSON.stringify(['host', 'agentName']),
      },
    };

    const pipedType = strictKeysRt(typeA.pipe(typeB));

    expect(isLeft(pipedType.decode(value))).toBe(true);
  });
});
