/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { get } from 'lodash';
import { schema } from '../..';
import { internals } from '../internals';
import type { TypeOptions } from './type';
import { Type, setLazyConfigSchemaDisabled } from './type';
import { UnionType } from './union_type';
import {
  META_FIELD_X_OAS_AVAILABILITY,
  META_FIELD_X_OAS_DEPRECATED,
  META_FIELD_X_OAS_DISCONTINUED,
} from '../oas_meta_fields';

class MyType extends Type<any> {
  constructor(
    opts: TypeOptions<any> = {},
    schemaFactory: () => ReturnType<typeof internals.any> = () => internals.any()
  ) {
    super(schemaFactory, opts);
  }
}

describe('meta', () => {
  it('sets meta when provided', () => {
    const semanticMeta = { description: 'my description', deprecated: true };
    const type = new MyType({
      meta: semanticMeta,
    });
    const meta = type.getSchema().describe();
    expect(type.getMeta()).toEqual(semanticMeta);
    expect(get(meta, 'flags.description')).toBe('my description');
    expect(get(meta, `metas[0].${META_FIELD_X_OAS_DEPRECATED}`)).toBe(true);
    expect(get(meta, `metas[1].${META_FIELD_X_OAS_DISCONTINUED}`)).toBeUndefined();
  });

  it('sets discontinued metadata when provided', () => {
    const type = new MyType({
      meta: {
        deprecated: true,
        'x-discontinued': '9.0.0',
      },
    });
    const meta = type.getSchema().describe();
    expect(get(meta, 'flags.description')).toBeUndefined();
    expect(get(meta, `metas[0].${META_FIELD_X_OAS_DEPRECATED}`)).toBe(true);
    expect(get(meta, `metas[1].${META_FIELD_X_OAS_DISCONTINUED}`)).toBe('9.0.0');
    expect(get(meta, `metas[2].${META_FIELD_X_OAS_AVAILABILITY}`)).toBeUndefined();
  });

  it('sets availability metadata when provided', () => {
    const type = new MyType({
      meta: {
        availability: { stability: 'stable', since: '9.4.0' },
      },
    });
    const meta = type.getSchema().describe();
    expect(get(meta, 'flags.description')).toBeUndefined();
    expect(get(meta, `metas[0].${META_FIELD_X_OAS_DISCONTINUED}`)).toBeUndefined();
    expect(get(meta, `metas[0].${META_FIELD_X_OAS_AVAILABILITY}`)).toEqual({
      stability: 'stable',
      since: '9.4.0',
    });
  });

  it('does not set meta when no provided', () => {
    const type = new MyType();
    const meta = type.getSchema().describe();
    expect(get(meta, 'flags.description')).toBeUndefined();
    expect(get(meta, 'metas')).toBeUndefined();
  });

  it('defers Joi schema construction until getSchema() or validate() is called', () => {
    const factory = jest.fn(() => internals.any());
    const type = new MyType({ meta: { description: 'deferred' } }, factory);
    expect(factory).not.toHaveBeenCalled();
    expect(type.getMeta()).toEqual({ description: 'deferred' });
    expect(factory).not.toHaveBeenCalled();

    type.validate('ok');
    expect(factory).toHaveBeenCalledTimes(1);
  });

  it('supports Object.freeze on Type instances without failing on validation', () => {
    const frozenLiteral = Object.freeze(internals.any().valid('a'));
    const frozenType = Object.freeze(new MyType({}, () => frozenLiteral));
    expect(frozenType.validate('a')).toBe('a');
  });
});

describe('options snapshot', () => {
  it('ignores mutations to the options object made after construction', () => {
    const numberOptions: { defaultValue: number; min: number } = { defaultValue: 1, min: 0 };
    const numberType = schema.number(numberOptions);
    numberOptions.defaultValue = 2;
    numberOptions.min = 10;
    expect(numberType.validate(undefined)).toBe(1);
    expect(numberType.validate(5)).toBe(5);

    const stringOptions: { maxLength: number } = { maxLength: 10 };
    const stringType = schema.string(stringOptions);
    stringOptions.maxLength = 1;
    expect(stringType.validate('abc')).toBe('abc');

    const objectOptions: { unknowns: 'allow' | 'forbid' } = { unknowns: 'allow' };
    const objectType = schema.object({}, objectOptions);
    objectOptions.unknowns = 'forbid';
    expect(objectType.validate({ extra: true })).toEqual({ extra: true });

    const unionTypes: Array<Type<string>> = [schema.literal('a')];
    const unionType = new UnionType(unionTypes);
    unionTypes.push(schema.literal('b'));
    expect(() => unionType.validate('b')).toThrow();
  });
});

describe('setLazyConfigSchemaDisabled', () => {
  afterEach(() => setLazyConfigSchemaDisabled(false));

  it('builds the Joi schema on first use by default', () => {
    const factory = jest.fn(() => internals.any());
    const type = new MyType({}, factory);
    expect(factory).not.toHaveBeenCalled();

    type.validate(1);
    expect(factory).toHaveBeenCalledTimes(1);
  });

  it('builds the Joi schema in the constructor when disabled', () => {
    setLazyConfigSchemaDisabled(true);
    const factory = jest.fn(() => internals.any());
    const type = new MyType({}, factory);
    expect(factory).toHaveBeenCalledTimes(1);

    type.validate(1);
    type.validate(2);
    expect(factory).toHaveBeenCalledTimes(1);
  });

  it('surfaces invalid Joi definitions at construction only when disabled', () => {
    const invalidIdSchema = () => schema.object({}, { meta: { id: 'has.period' } });

    expect(invalidIdSchema).not.toThrow();
    expect(() => invalidIdSchema().validate({})).toThrow('id cannot contain period character');

    setLazyConfigSchemaDisabled(true);
    expect(invalidIdSchema).toThrow('id cannot contain period character');
  });
});
