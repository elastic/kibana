/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { OasSchema } from './oas_model';
import { Compiler } from './oas_model';

const compile = (schema: OasSchema, schemas: Record<string, OasSchema> = {}) =>
  new Compiler({ components: { schemas } }).compile(schema);

const obj = (properties: Record<string, OasSchema>, required: string[] = []): OasSchema => ({
  type: 'object',
  properties,
  required,
});
const str: OasSchema = { type: 'string' };
const num: OasSchema = { type: 'number' };

describe('Compiler', () => {
  it('turns a property the merged variants define with different primitive types into a JSON leaf', () => {
    expect(
      compile({ anyOf: [obj({ size: str }), obj({ size: num })], 'x-tf-union': { merge: true } })
    ).toEqual({
      k: 'object',
      props: [
        {
          apiName: 'size',
          tfName: 'size_json',
          node: { k: 'json' },
          required: false,
          flatten: false,
        },
      ],
    });
  });

  it('throws on a json_leaves path that matches no variant', () => {
    expect(() =>
      compile({
        title: 'Chart',
        anyOf: [obj({ metric: str }), obj({ metric: str })],
        'x-tf-union': { merge: true, json_leaves: { metrc: 'metric_json' } },
      })
    ).toThrow('json_leaves path "metrc" matches no property in Chart');
  });

  it('throws on an x-tf-union-override that is not on a mapped union', () => {
    expect(() =>
      compile(obj({ drilldowns: { ...str, 'x-tf-union-override': { key_template: 'x' } } }))
    ).toThrow('x-tf-union-override');
  });

  it('keeps the properties of an allOf wrapper around a union', () => {
    const node = compile({
      allOf: [
        {
          anyOf: [obj({ type: { enum: ['a'] }, a: str }), obj({ type: { enum: ['b'] }, b: str })],
          'x-tf-union': { discriminator: 'type' },
        },
      ],
      properties: { shared: str },
    });
    expect(node.k === 'keyed' && node.variants.map(({ content }) => content)).toEqual([
      expect.objectContaining({
        props: expect.arrayContaining([expect.objectContaining({ apiName: 'shared' })]),
      }),
      expect.objectContaining({
        props: expect.arrayContaining([expect.objectContaining({ apiName: 'shared' })]),
      }),
    ]);
  });

  it('compiles an unwrapped one-property object as that property', () => {
    expect(
      compile(
        obj({
          grid: { ...obj({ visible: { type: 'boolean' } }, ['visible']), 'x-tf-unwrap': true },
        })
      )
    ).toEqual({
      k: 'object',
      props: [
        {
          apiName: 'grid',
          tfName: 'grid',
          node: { k: 'prim', type: 'bool' },
          required: false,
          flatten: false,
          unwrap: 'visible',
        },
      ],
    });
  });

  it.each<[string, OasSchema]>([
    ['two properties', obj({ a: str, b: str }, ['a', 'b'])],
    ['an optional property', obj({ a: str })],
    ['no object', str],
    ['a flattened object', { ...obj({ a: str }, ['a']), 'x-tf-flatten': true }],
  ])('throws on x-tf-unwrap on %s', (_, schema) => {
    expect(() => compile(obj({ grid: { ...schema, 'x-tf-unwrap': true } }))).toThrow(
      'x-tf-unwrap at .grid'
    );
  });

  it('compiles a single-part allOf wrapper as its part', () => {
    expect(
      compile(obj({ mode: { allOf: [{ $ref: '#/components/schemas/Mode' }] } }), {
        Mode: { enum: ['a', 'b'] },
      })
    ).toEqual({
      k: 'object',
      props: [
        {
          apiName: 'mode',
          tfName: 'mode',
          node: { k: 'prim', type: 'string' },
          required: false,
          flatten: false,
        },
      ],
    });
  });

  it('collects the outside properties of every branch in content mode', () => {
    const node = compile({
      anyOf: [
        obj({ type: { enum: ['a'] }, config: obj({}), id: str }, ['type', 'config', 'id']),
        obj({ type: { enum: ['b'] }, config: obj({}), id: str, grid: str }, [
          'type',
          'config',
          'id',
        ]),
      ],
      'x-tf-union': { discriminator: 'type', content: 'config' },
    });
    expect(
      node.k === 'keyed' && node.outside.map(({ apiName, required }) => [apiName, required])
    ).toEqual([
      ['id', true],
      ['grid', false],
    ]);
  });
});
