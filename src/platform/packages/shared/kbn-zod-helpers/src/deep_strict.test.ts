/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z } from '@kbn/zod';
import { DeepStrict } from './deep_strict';
import { isValidDateMath } from './is_valid_date_math';

function wrap(schema: z.Schema) {
  const wrappedSchema = DeepStrict(schema);

  function wrapInner() {
    return {
      passes: (value: unknown) => {
        wrappedSchema.parse(value);
        return wrapInner();
      },
      fails: (value: unknown) => {
        const result = wrappedSchema.safeParse(value);
        if (result.success) {
          throw new Error(`Expected value to fail validation`);
        }
        return wrapInner();
      },
    };
  }

  return wrapInner();
}

describe('DeepStrict', () => {
  const timeWindowRt = z.union([
    z.object({ duration: z.string() }),
    z.object({ start_time: z.string().superRefine(isValidDateMath) }),
  ]);

  const metricQueryRt = z.union([
    z.object({
      avg_over_time: z.intersection(
        z.object({
          field: z.string(),
        }),
        z
          .object({
            range: z.string().optional(),
          })
          .optional()
      ),
    }),
    z.object({
      count_over_time: z.strictObject({}),
    }),
  ]);

  const metricExpressionRt = z.object({
    expression: z.string(),
  });

  const metricRt = z.intersection(
    z
      .object({
        record: z.boolean().optional(),
      })
      .optional(),
    z.union([metricQueryRt, metricExpressionRt])
  );

  const metricContainerRt = z.record(z.string(), metricRt);

  const groupingRt = z.object({
    by: z.record(
      z.string(),
      z.object({
        field: z.string(),
      })
    ),
    limit: z.number(),
  });

  const queryRt = z.intersection(
    z.union([groupingRt, z.object({})]),
    z.intersection(
      z.object({
        index: z.union([z.string(), z.array(z.string())]),
        metrics: metricContainerRt,
      }),
      z
        .object({
          filter: z.string().optional(),
          round: z.string().optional(),
          runtime_mappings: z.string().optional(),
          query_delay: z.string().optional(),
        })
        .optional()
    )
  );

  it('intersection with optional', () => {
    wrap(
      z
        .intersection(
          z.object({ foo: z.string() }),
          z.object({ bar: z.string().optional() }).optional()
        )
        .optional()
    )
      .passes({ foo: '' })
      .passes({ foo: '', bar: '' })
      .fails({ foo: '', unknownKey: '' })
      .fails({ foo: '', bar: '', unknownKey: '' });
  });

  it('object with union types', () => {
    wrap(
      z.object({
        path: z.union([
          z.object({ serviceName: z.string() }),
          z.object({ transactionType: z.string() }),
        ]),
      })
    )
      .passes({ path: { serviceName: '' } })
      .passes({ path: { transactionType: '' } })
      .fails({ path: { serviceName: '', unknownKey: '' } })
      .fails({ path: { transactionType: '', unknownKey: '' } })
      .fails({ path: { serviceName: '', transactionType: '' } })
      .fails({ path: { serviceName: '' }, unknownKey: '' });
  });

  it('object with deep optional keys', () => {
    wrap(
      z.intersection(
        z.object({ query: z.object({ bar: z.string() }) }),
        z.object({ query: z.object({ _inspect: z.boolean() }).optional() }).optional()
      )
    )
      .passes({ query: { bar: '', _inspect: true } })
      .fails({ query: { _inspect: true } });
  });

  it('complex object', () => {
    const fromSchema = z
      .object({
        from: z.string().optional(),
      })
      .optional();

    const configSchema = z.object({
      config: z.intersection(
        fromSchema,
        z.intersection(
          z.object({
            alert: z.object({}),
          }),
          z.union([
            z.object({
              query: queryRt,
            }),
            z.object({
              queries: z.array(queryRt),
            }),
          ])
        )
      ),
    });

    wrap(
      z.object({
        body: z.intersection(fromSchema, configSchema),
      })
    )
      .passes({
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
      })
      .fails({
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
      });
  });

  it('refinements', () => {
    wrap(z.object({ body: timeWindowRt }))
      .passes({ body: { duration: '1d' } })
      .passes({ body: { start_time: '2022-05-20T08:10:15.000Z' } })
      .fails({ body: { duration: '1d', start_time: '2022-05-20T08:10:15.000Z' } })
      .fails({ body: { duration: '1d', unknownKey: '' } })
      .fails({ body: { start_time: '2022-05-20T08:10:15.000Z', unknownKey: '' } })
      .fails({ body: { unknownKey: '' } })
      .fails({ body: { start_time: 'invalid' } })
      .fails({ body: { duration: false } });
  });

  it('arrays', () => {
    const schema = z.array(z.object({ foo: z.string() }));

    wrap(schema)
      .passes([{ foo: 'bar' }])
      .passes([{ foo: 'baz' }, { foo: 'bar' }])
      .fails([{ foo: 'bar', bar: 'foo' }]);
  });

  it('nested arrays', () => {
    wrap(
      z.object({
        nestedArray: z.array(
          z.object({
            bar: z.string(),
          })
        ),
      })
    )
      .passes({
        nestedArray: [],
      })
      .passes({
        nestedArray: [
          {
            bar: 'foo',
          },
        ],
      })
      .fails({
        nestedArray: [
          {
            bar: 'foo',
            foo: 'bar',
          },
        ],
      });
  });

  it('deals with union types', () => {
    const type = z.intersection(
      z.object({
        required: z.string(),
      }),
      z
        .object({
          disable: z.union([
            z.boolean(),
            z.object({
              except: z.array(z.string()),
            }),
          ]),
        })
        .optional()
    );

    wrap(type).passes({
      required: 'required',
      disable: {
        except: ['foo'],
      },
    });
  });
});
