/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { schema } from '@kbn/config-schema';
import type { OpenAPIV3 } from 'openapi-types';
import {
  is,
  convert,
  convertPathParameters,
  convertQuery,
  isNullableObjectType,
  getParamSchema,
} from './lib';

import { createLargeSchema } from './lib.test.util';

describe('convert', () => {
  test('base case', () => {
    expect(convert(createLargeSchema())).toEqual({
      schema: {
        additionalProperties: false,
        properties: {
          any: { description: 'any type', nullable: true },
          array: {
            items: {
              additionalProperties: false,
              properties: {
                foo: {
                  type: 'string',
                },
              },
              required: ['foo'],
              type: 'object',
            },
            type: 'array',
          },
          arrayWithId: {
            $ref: '#/components/schemas/myArray',
          },
          booleanDefault: {
            default: true,
            description: 'defaults to to true',
            type: 'boolean',
          },
          ipType: {
            format: 'ipv4',
            type: 'string',
          },
          literalType: {
            enum: ['literallythis'],
            type: 'string',
          },
          map: {
            additionalProperties: {
              type: 'string',
            },
            type: 'object',
          },
          maybeNumber: {
            maximum: 1000,
            minimum: 1,
            type: 'number',
          },
          record: {
            additionalProperties: {
              type: 'string',
            },
            type: 'object',
          },
          string: {
            maxLength: 10,
            minLength: 1,
            type: 'string',
          },
          union: {
            anyOf: [
              {
                description: 'Union string',
                maxLength: 1,
                type: 'string',
              },
              {
                description: 'Union number',
                minimum: 0,
                type: 'number',
              },
            ],
          },
          unionWithId: {
            $ref: '#/components/schemas/myUnion',
          },
          uri: {
            default: 'prototest://something',
            format: 'uri',
            type: 'string',
          },
        },
        required: [
          'string',
          'ipType',
          'literalType',
          'map',
          'record',
          'union',
          'unionWithId',
          'array',
          'arrayWithId',
          'any',
        ],
        type: 'object',
      },
      shared: {
        myArray: {
          items: {
            type: 'object',
            additionalProperties: false,
            properties: {
              foo: { type: 'string' },
            },
            required: ['foo'],
          },
          type: 'array',
          title: 'myArray',
        },
        myUnion: {
          anyOf: [
            {
              description: 'Union string',
              maxLength: 1,
              type: 'string',
            },
            {
              description: 'Union number',
              minimum: 0,
              type: 'number',
            },
          ],
          title: 'myUnion',
        },
      },
    });
  });

  test('shared schemas', () => {
    const idSchema = schema.object({ a: schema.string() }, { meta: { id: 'myId' } });
    const otherSchema = schema.object({ id: idSchema });
    expect(convert(otherSchema)).toEqual({
      schema: {
        additionalProperties: false,
        properties: {
          id: {
            $ref: '#/components/schemas/myId',
          },
        },
        required: ['id'],
        type: 'object',
      },
      shared: {
        myId: {
          title: 'myId',
          additionalProperties: false,
          properties: {
            a: {
              type: 'string',
            },
          },
          required: ['a'],
          type: 'object',
        },
      },
    });
  });

  test('does not require referenced fields that are optional at runtime', () => {
    const maybeObjectSchema = schema.object(
      { a: schema.string() },
      { meta: { id: 'maybeObjectSchema' } }
    );
    const maybeOneOfSchema = schema.oneOf([schema.literal('s'), schema.literal('m')], {
      meta: { id: 'maybeOneOfSchema' },
    });
    const objectWithDefaultSchema = schema.object(
      { b: schema.string() },
      { defaultValue: { b: 'default' }, meta: { id: 'objectWithDefaultSchema' } }
    );
    const requiredObjectSchema = schema.object(
      { c: schema.string() },
      { meta: { id: 'requiredObjectSchema' } }
    );
    const otherSchema = schema.object({
      maybeObject: schema.maybe(maybeObjectSchema),
      maybeOneOf: schema.maybe(maybeOneOfSchema),
      objectWithDefault: objectWithDefaultSchema,
      requiredObject: requiredObjectSchema,
    });

    expect(convert(otherSchema)).toEqual({
      schema: {
        additionalProperties: false,
        properties: {
          maybeObject: {
            $ref: '#/components/schemas/maybeObjectSchema',
          },
          maybeOneOf: {
            $ref: '#/components/schemas/maybeOneOfSchema',
          },
          objectWithDefault: {
            $ref: '#/components/schemas/objectWithDefaultSchema',
          },
          requiredObject: {
            $ref: '#/components/schemas/requiredObjectSchema',
          },
        },
        required: ['requiredObject'],
        type: 'object',
      },
      shared: {
        maybeObjectSchema: {
          title: 'maybeObjectSchema',
          additionalProperties: false,
          properties: {
            a: {
              type: 'string',
            },
          },
          required: ['a'],
          type: 'object',
        },
        maybeOneOfSchema: {
          enum: ['s', 'm'],
          title: 'maybeOneOfSchema',
          type: 'string',
        },
        objectWithDefaultSchema: {
          title: 'objectWithDefaultSchema',
          additionalProperties: false,
          default: {
            b: 'default',
          },
          properties: {
            b: {
              type: 'string',
            },
          },
          required: ['b'],
          type: 'object',
        },
        requiredObjectSchema: {
          title: 'requiredObjectSchema',
          additionalProperties: false,
          properties: {
            c: {
              type: 'string',
            },
          },
          required: ['c'],
          type: 'object',
        },
      },
    });

    expect(
      convert(
        schema.object({
          maybeObject: schema.maybe(maybeObjectSchema),
          objectWithDefault: objectWithDefaultSchema,
        })
      ).schema
    ).not.toHaveProperty('required');
  });

  test('does not require nullable fields that are optional at runtime', () => {
    const type = schema.object({
      str: schema.string(),
      nullableStr: schema.nullable(schema.string()),
    });

    expect(convert(type)).toEqual({
      schema: {
        additionalProperties: false,
        properties: {
          str: {
            type: 'string',
          },
          nullableStr: {
            default: null,
            nullable: true,
            type: 'string',
          },
        },
        required: ['str'],
        type: 'object',
      },
      shared: {},
    });
  });

  test('ignores inner defaultValue when converting schema.nullable', () => {
    expect(
      convert(
        schema.object({
          nullableStr: schema.nullable(
            schema.string({
              defaultValue: 'ignored',
            })
          ),
        })
      )
    ).toEqual({
      schema: {
        additionalProperties: false,
        properties: {
          nullableStr: {
            default: null,
            nullable: true,
            type: 'string',
          },
        },
        type: 'object',
      },
      shared: {},
    });
  });

  test('includes null in enum when converting schema.nullable oneOf literals', () => {
    expect(
      convert(
        schema.nullable(schema.oneOf([schema.literal(1), schema.literal(2), schema.literal(3)]))
      )
    ).toEqual({
      schema: {
        default: null,
        enum: [1, 2, 3, null],
        nullable: true,
        type: 'integer',
      },
      shared: {},
    });
  });

  test('materializes function defaults once for referenced schemas', () => {
    const defaultValue = jest.fn(() => ({ b: 'default' }));
    const objectWithFunctionDefaultSchema = schema.object(
      { b: schema.string() },
      { defaultValue, meta: { id: 'objectWithFunctionDefaultSchema' } }
    );

    const converted = convert(
      schema.object({ objectWithFunctionDefault: objectWithFunctionDefaultSchema })
    );

    expect(converted.schema).not.toHaveProperty('required');
    expect(converted.shared.objectWithFunctionDefaultSchema.default).toEqual({ b: 'default' });
    expect(defaultValue).toHaveBeenCalledTimes(1);
  });

  test('does not require maybe referenced fields in array item schemas', () => {
    const timeRangeSchema = schema.object(
      {
        from: schema.string(),
        to: schema.string(),
      },
      { meta: { id: 'arrayItemTimeRangeSchema' } }
    );

    const converted = convert(
      schema.object({
        dashboards: schema.arrayOf(
          schema.object({
            data: schema.object({
              time_range: schema.maybe(timeRangeSchema),
              title: schema.string(),
            }),
          })
        ),
      })
    );

    const dashboardsSchema = converted.schema.properties!.dashboards as OpenAPIV3.ArraySchemaObject;
    const dashboardItemSchema = dashboardsSchema.items as OpenAPIV3.SchemaObject;
    const dataSchema = dashboardItemSchema.properties!.data as OpenAPIV3.SchemaObject;

    expect(dataSchema.required).toEqual(['title']);
  });

  test('does not require maybe referenced fields in shared array item schemas', () => {
    const timeRangeSchema = schema.object(
      {
        from: schema.string(),
        to: schema.string(),
      },
      { meta: { id: 'sharedArrayItemTimeRangeSchema' } }
    );
    const dashboardSchema = schema.object(
      {
        data: schema.object({
          time_range: schema.maybe(timeRangeSchema),
          title: schema.string(),
        }),
      },
      { meta: { id: 'sharedArrayItemDashboardSchema' } }
    );

    const converted = convert(
      schema.object({
        dashboards: schema.arrayOf(dashboardSchema),
      })
    );

    const dashboardsSchema = converted.schema.properties!.dashboards as OpenAPIV3.ArraySchemaObject;
    const dashboardItemSchema = converted.shared
      .sharedArrayItemDashboardSchema as OpenAPIV3.SchemaObject;
    const dataSchema = dashboardItemSchema.properties!.data as OpenAPIV3.SchemaObject;

    expect(dashboardsSchema.items).toEqual({
      $ref: '#/components/schemas/sharedArrayItemDashboardSchema',
    });
    expect(dataSchema.required).toEqual(['title']);
  });

  test('strips internal "x-oas-" markers from converted schemas', () => {
    const referencedSchema = schema.object(
      { value: schema.string() },
      { meta: { id: 'optionalMarkerReferenceSchema' } }
    );

    const converted = convert(
      schema.maybe(
        schema.object({
          inline: schema.maybe(
            schema.object({
              value: schema.arrayOf(schema.maybe(schema.string())),
              value2: schema.number({ defaultValue: () => 42 }),
              value3: schema.maybe(
                schema.object({ foo: schema.string({ maxLength: 33 }) }, { meta: { id: 'Value3' } })
              ),
              value4: schema.oneOf([schema.string(), schema.maybe(schema.number())]),
              value5: schema.discriminatedUnion('type', [
                schema.object(
                  { type: schema.literal('1'), value: schema.maybe(schema.number()) },
                  { meta: { id: 'one' } }
                ),
                schema.object(
                  { type: schema.literal('2'), value: schema.maybe(schema.string()) },
                  { meta: { id: 'two' } }
                ),
              ]),
            })
          ),
          referenced: schema.maybe(referencedSchema),
        })
      )
    );

    const xOasKeys: string[] = [];
    JSON.stringify(converted, (key, value) => {
      if (typeof key === 'string' && key.startsWith('x-oas')) xOasKeys.push(key);
      return value;
    });

    expect(xOasKeys).toEqual([]);
  });

  test('does not leak maybe metadata into later uses of the same shared schema', () => {
    const sharedSchemas = new Map();
    const sharedSchema = schema.object(
      { a: schema.string() },
      { meta: { id: 'reusedSharedSchema' } }
    );

    // Using the maybe and non-maybe variants in the same object is rejected by Joi because
    // both schemas have the same id. This models the realistic route-to-route reuse instead.
    expect(
      convert(schema.object({ optionalRef: schema.maybe(sharedSchema) }), { sharedSchemas }).schema
    ).toEqual({
      additionalProperties: false,
      properties: {
        optionalRef: {
          $ref: '#/components/schemas/reusedSharedSchema',
        },
      },
      type: 'object',
    });

    expect(convert(schema.object({ requiredRef: sharedSchema }), { sharedSchemas })).toEqual({
      schema: {
        additionalProperties: false,
        properties: {
          requiredRef: {
            $ref: '#/components/schemas/reusedSharedSchema',
          },
        },
        required: ['requiredRef'],
        type: 'object',
      },
      shared: {
        reusedSharedSchema: {
          title: 'reusedSharedSchema',
          additionalProperties: false,
          properties: {
            a: {
              type: 'string',
            },
          },
          required: ['a'],
          type: 'object',
        },
      },
    });

    expect(
      convert(schema.object({ optionalRef: schema.maybe(sharedSchema) }), { sharedSchemas })
    ).toEqual({
      schema: {
        additionalProperties: false,
        properties: {
          optionalRef: {
            $ref: '#/components/schemas/reusedSharedSchema',
          },
        },
        type: 'object',
      },
      shared: {
        reusedSharedSchema: {
          title: 'reusedSharedSchema',
          additionalProperties: false,
          properties: {
            a: {
              type: 'string',
            },
          },
          required: ['a'],
          type: 'object',
        },
      },
    });
  });

  test('does not make nested required references optional when the same shared schema is also maybe', () => {
    const sharedSchema = schema.object(
      { a: schema.string() },
      { meta: { id: 'nestedReusedSharedSchema' } }
    );

    expect(
      convert(
        schema.object({
          nested: schema.object({ optionalRef: schema.maybe(sharedSchema) }),
          requiredRef: sharedSchema,
        })
      ).schema
    ).toEqual({
      additionalProperties: false,
      properties: {
        nested: {
          additionalProperties: false,
          properties: {
            optionalRef: {
              $ref: '#/components/schemas/nestedReusedSharedSchema',
            },
          },
          type: 'object',
        },
        requiredRef: {
          $ref: '#/components/schemas/nestedReusedSharedSchema',
        },
      },
      required: ['nested', 'requiredRef'],
      type: 'object',
    });
  });

  test('does not require maybe referenced fields added through object extends', () => {
    const baseSchema = schema.object({
      format: schema.string(),
    });

    expect(
      convert(
        baseSchema.extends(
          {
            field: schema.string(),
            timeScale: schema.maybe(
              schema.oneOf([schema.literal('s'), schema.literal('m')], {
                meta: { id: 'extendedTimeScaleSchema' },
              })
            ),
          },
          { meta: { id: 'extendedMetricOperation' } }
        )
      )
    ).toEqual({
      schema: {
        $ref: '#/components/schemas/extendedMetricOperation',
      },
      shared: {
        extendedMetricOperation: {
          additionalProperties: false,
          properties: {
            field: {
              type: 'string',
            },
            format: {
              type: 'string',
            },
            timeScale: {
              $ref: '#/components/schemas/extendedTimeScaleSchema',
            },
          },
          required: ['format', 'field'],
          title: 'extendedMetricOperation',
          type: 'object',
        },
        extendedTimeScaleSchema: {
          enum: ['s', 'm'],
          title: 'extendedTimeScaleSchema',
          type: 'string',
        },
      },
    });
  });

  test('does not require maybe referenced fields inherited through chained object extends', () => {
    const genericOptionsSchema = schema.object({
      format: schema.string(),
    });
    const sharedOperationSchema = genericOptionsSchema.extends({
      timeScale: schema.maybe(
        schema.oneOf([schema.literal('s'), schema.literal('m')], {
          meta: { id: 'chainedTimeScaleSchema' },
        })
      ),
    });
    const fieldBasedOperationSchema = sharedOperationSchema.extends({
      field: schema.string(),
    });
    const concreteOperationSchema = fieldBasedOperationSchema.extends(
      {
        operation: schema.literal('count'),
      },
      { meta: { id: 'chainedMetricOperation' } }
    );

    expect(convert(concreteOperationSchema).shared.chainedMetricOperation.required).toEqual([
      'format',
      'field',
      'operation',
    ]);
  });

  test('does not require maybe referenced fields in id schemas inside oneOf', () => {
    const genericOptionsSchema = schema.object({
      format: schema.string(),
    });
    const sharedOperationSchema = genericOptionsSchema.extends({
      timeScale: schema.maybe(
        schema.oneOf([schema.literal('s'), schema.literal('m')], {
          meta: { id: 'oneOfTimeScaleSchema' },
        })
      ),
    });
    const countOperationSchema = sharedOperationSchema.extends(
      {
        operation: schema.literal('count'),
      },
      { meta: { id: 'oneOfCountOperation' } }
    );

    expect(
      convert(schema.oneOf([countOperationSchema])).shared.oneOfCountOperation.required
    ).toEqual(['format', 'operation']);
  });

  test('does not require reused maybe referenced fields across oneOf id schemas', () => {
    const timeScaleSchema = schema.maybe(
      schema.oneOf([schema.literal('s'), schema.literal('m')], {
        meta: { id: 'reusedOneOfTimeScaleSchema' },
      })
    );
    const genericOptionsSchema = schema.object({
      format: schema.string(),
      time_scale: timeScaleSchema,
    });
    const countOperationSchema = genericOptionsSchema.extends(
      {
        operation: schema.literal('count'),
      },
      { meta: { id: 'reusedOneOfCountOperation' } }
    );
    const sumOperationSchema = genericOptionsSchema.extends(
      {
        operation: schema.literal('sum'),
      },
      { meta: { id: 'reusedOneOfSumOperation' } }
    );

    const converted = convert(schema.oneOf([countOperationSchema, sumOperationSchema]));

    expect(converted.shared.reusedOneOfCountOperation.required).toEqual(['format', 'operation']);
    expect(converted.shared.reusedOneOfSumOperation.required).toEqual(['format', 'operation']);
  });

  test('does not require reused maybe referenced fields across discriminated union id schemas', () => {
    const timeScaleSchema = schema.maybe(
      schema.oneOf([schema.literal('s'), schema.literal('m')], {
        meta: { id: 'discriminatedTimeScaleSchema' },
      })
    );
    const genericOptionsSchema = schema.object({
      format: schema.string(),
      time_scale: timeScaleSchema,
    });
    const countOperationSchema = genericOptionsSchema.extends(
      {
        type: schema.literal('count'),
      },
      { meta: { id: 'discriminatedCountOperation' } }
    );
    const sumOperationSchema = genericOptionsSchema.extends(
      {
        type: schema.literal('sum'),
      },
      { meta: { id: 'discriminatedSumOperation' } }
    );

    const converted = convert(
      schema.discriminatedUnion('type', [countOperationSchema, sumOperationSchema])
    );

    expect(converted.shared.discriminatedCountOperation.required).toEqual(['format', 'type']);
    expect(converted.shared.discriminatedSumOperation.required).toEqual(['format', 'type']);
  });

  test('does not require maybe referenced fields in conditional id schemas', () => {
    const timeScaleSchema = schema.maybe(
      schema.oneOf([schema.literal('s'), schema.literal('m')], {
        meta: { id: 'conditionalTimeScaleSchema' },
      })
    );
    const thenSchema = schema.object(
      {
        time_scale: timeScaleSchema,
        required: schema.string(),
      },
      { meta: { id: 'conditionalThenSchema' } }
    );
    const otherwiseSchema = schema.object(
      {
        time_scale: timeScaleSchema,
        required: schema.string(),
      },
      { meta: { id: 'conditionalOtherwiseSchema' } }
    );

    const converted = convert(
      schema.object({
        kind: schema.string(),
        value: schema.conditional(schema.siblingRef('kind'), 'then', thenSchema, otherwiseSchema),
      })
    );

    expect(converted.shared.conditionalThenSchema.required).toEqual(['required']);
    expect(converted.shared.conditionalOtherwiseSchema.required).toEqual(['required']);
  });
});

describe('convertPathParameters', () => {
  test('base conversion', () => {
    expect(
      convertPathParameters(schema.object({ a: schema.string() }), { a: { optional: false } })
    ).toEqual({
      params: [
        {
          in: 'path',
          name: 'a',
          required: true,
          schema: {
            type: 'string',
          },
        },
      ],
      shared: {},
    });
  });
  test('conversion with refs is disallowed', () => {
    const sharedSchema = schema.object({ a: schema.string() }, { meta: { id: 'myparams' } });
    expect(() => convertPathParameters(sharedSchema, { a: { optional: false } })).toThrow(
      /myparams.*not supported/
    );
  });
  test('throws if known parameters not found', () => {
    expect(() =>
      convertPathParameters(schema.object({ b: schema.string() }), { a: { optional: false } })
    ).toThrow(/Unknown parameter: b/);
  });

  test('converting paths with nullables', () => {
    expect(
      convertPathParameters(schema.nullable(schema.object({ a: schema.string() })), {
        a: { optional: true },
      })
    ).toEqual({
      params: [
        {
          in: 'path',
          name: 'a',
          required: true,
          schema: {
            type: 'string',
          },
        },
      ],
      shared: {},
    });
  });

  test('throws if properties cannot be exracted', () => {
    expect(() => convertPathParameters(schema.string(), {})).toThrow(/expected to be an object/);
  });
});

describe('convertQuery', () => {
  test('base conversion', () => {
    expect(convertQuery(schema.object({ a: schema.string() }))).toEqual({
      query: [
        {
          in: 'query',
          name: 'a',
          required: true,
          schema: {
            type: 'string',
          },
        },
      ],
      shared: {},
    });
  });

  test('converting queries with nullables', () => {
    expect(convertQuery(schema.nullable(schema.object({ a: schema.string() })))).toEqual({
      query: [
        {
          in: 'query',
          name: 'a',
          required: false,
          schema: {
            type: 'string',
          },
        },
      ],
      shared: {},
    });
  });

  test('collapses oneOf [scalar, array] query params to array', () => {
    expect(
      convertQuery(
        schema.object({
          status: schema.maybe(schema.oneOf([schema.string(), schema.arrayOf(schema.string())])),
        })
      )
    ).toEqual({
      query: [
        {
          in: 'query',
          name: 'status',
          required: false,
          schema: {
            type: 'array',
            items: { type: 'string' },
          },
        },
      ],
      shared: {},
    });
  });

  test('collapses oneOf [enum, array[enum]] query params preserving enum', () => {
    expect(
      convertQuery(
        schema.object({
          status: schema.maybe(
            schema.oneOf([
              schema.oneOf([schema.literal('running'), schema.literal('finished')]),
              schema.arrayOf(schema.oneOf([schema.literal('running'), schema.literal('finished')])),
            ])
          ),
        })
      )
    ).toEqual({
      query: [
        {
          in: 'query',
          name: 'status',
          required: false,
          schema: {
            type: 'array',
            items: { type: 'string', enum: ['running', 'finished'] },
          },
        },
      ],
      shared: {},
    });
  });

  test('conversion with refs is disallowed', () => {
    const sharedSchema = schema.object({ a: schema.string() }, { meta: { id: 'myparams' } });
    expect(() => convertQuery(sharedSchema)).toThrow(/myparams.*not supported/);
  });

  test('throws if properties cannot be exracted', () => {
    expect(() => convertPathParameters(schema.string(), {})).toThrow(/expected to be an object/);
  });
});

describe('is', () => {
  test.each([
    [{}, false],
    [1, false],
    [undefined, false],
    [null, false],
    [schema.any(), false], // ignore any
    [schema.object({}, { defaultValue: {}, unknowns: 'allow' }), false], // ignore any
    [schema.never(), false],
    [schema.string(), true],
    [schema.number(), true],
    [schema.mapOf(schema.string(), schema.number()), true],
    [schema.recordOf(schema.string(), schema.number()), true],
    [schema.arrayOf(schema.string()), true],
    [schema.object({}), true],
    [schema.oneOf([schema.string(), schema.number()]), true],
    [schema.maybe(schema.literal('yes')), true],
  ])('"is" correctly identifies %#', (value, result) => {
    expect(is(value)).toBe(result);
  });
});

test('isNullableObjectType', () => {
  const any = schema.any({});
  expect(isNullableObjectType(any.getSchema().describe())).toBe(false);

  const nullableAny = schema.nullable(any);
  expect(isNullableObjectType(nullableAny.getSchema().describe())).toBe(false);

  const nullableObject = schema.nullable(schema.object({}));
  expect(isNullableObjectType(nullableObject.getSchema().describe())).toBe(true);
});

test('getParamSchema from {pathVar*}', () => {
  const a = { optional: true };
  const b = { optional: true };
  const c = { optional: true };
  const keyName = 'pathVar';
  // Special * syntax in API defs
  expect(getParamSchema({ a, b, [`${keyName}*`]: c }, keyName)).toBe(c);
  // Special * syntax with ? in API defs
  expect(getParamSchema({ a, b, [`${keyName}?*`]: c }, keyName)).toBe(c);
});
