/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { get } from 'lodash';
import { expectAssignable } from 'tsd';
import moment from 'moment';
import { internals } from '../internals';
import { schema } from '../..';
import { Type, TypeOf, TypeOfOutput, TypeOptions } from './type';
import { META_FIELD_X_OAS_DEPRECATED } from '../oas_meta_fields';

class MyType extends Type<any> {
  constructor(opts: TypeOptions<any> = {}) {
    super(internals.any(), opts);
  }
}

describe('meta', () => {
  it('sets meta when provided', () => {
    const type = new MyType({
      meta: { description: 'my description', deprecated: true },
    });
    const meta = type.getSchema().describe();
    expect(get(meta, 'flags.description')).toBe('my description');
    expect(get(meta, `metas[0].${META_FIELD_X_OAS_DEPRECATED}`)).toBe(true);
  });

  it('does not set meta when no provided', () => {
    const type = new MyType();
    const meta = type.getSchema().describe();
    expect(get(meta, 'flags.description')).toBeUndefined();
    expect(get(meta, 'metas')).toBeUndefined();
  });
});

describe('transform', () => {
  afterEach(() => jest.clearAllMocks());
  const durationTransformation = jest.fn(moment.duration);
  // Explicitly define the type to catch type errors
  const durationSchema: Type<string, moment.Duration> = schema
    .string({
      maxLength: 3,
      validate: (v) =>
        /^\d+(M|w|d|H|m|s|ms)$/.test(v) ? undefined : `expected "${v}" to be a duration like "1d"`,
    })
    .transform(durationTransformation);
  it('transforms values', () => {
    const duration = durationSchema.validate('1d');
    expect(moment.isDuration(duration)).toBe(true);
    expect(durationTransformation).toHaveBeenCalledTimes(1);
    expect(durationTransformation).toHaveBeenCalledWith('1d');
  });
  it('transforms nested values', () => {
    const obj = schema.object({
      a: schema.object({ durationA: durationSchema, durationB: durationSchema }),
    });
    const result = obj.validate({ a: { durationA: '1d', durationB: '1m' } });

    expectAssignable<{ a: { durationA: moment.Duration; durationB: moment.Duration } }>(result);
    const {
      a: { durationA, durationB },
    } = result;

    expect(moment.isDuration(durationA)).toBe(true);
    expect(moment.isDuration(durationB)).toBe(true);
    expect(durationTransformation).toHaveBeenCalledTimes(2);
    expect(durationTransformation).toHaveBeenNthCalledWith(1, '1d');
    expect(durationTransformation).toHaveBeenNthCalledWith(2, '1m');
  });
  it('works with extended, nested values', () => {
    const obj = schema.object({
      a: schema.object({ durationA: durationSchema, durationB: durationSchema }),
    });
    const objExtended = obj.extends({ b: schema.object({ durationC: durationSchema }) });
    const result = objExtended.validate({
      a: { durationA: '1d', durationB: '1m' },
      b: { durationC: '2M' },
    });

    expectAssignable<{
      a: { durationA: moment.Duration; durationB: moment.Duration };
      b: { durationC: moment.Duration };
    }>(result);

    const {
      a: { durationA, durationB },
      b: { durationC },
    } = result;
    expect(moment.isDuration(durationA)).toBe(true);
    expect(moment.isDuration(durationB)).toBe(true);
    expect(moment.isDuration(durationC)).toBe(true);
    expect(durationTransformation).toHaveBeenCalledTimes(3);
  });
  it('still reports errors as expected', () => {
    expect(() => durationSchema.validate('hello there')).toThrowError(/must have a maximum length/);
    expect(() => durationSchema.validate('1v')).toThrowError(
      `expected "1v" to be a duration like "1d"`
    );
  });
  it('only runs the last provided transform function', () => {
    const transform1 = jest.fn((v) => Number(v));
    const transform2 = jest.fn((v) => Boolean(v));
    const transform3 = jest.fn((v) => String(v));
    // Explicitly define the type to catch type errors, we should reflect the type
    // of the last provided transform function
    const stringSchema: Type<string, string> = schema
      .string()
      .transform(transform1)
      .transform(transform2)
      .transform(transform3);

    const result = stringSchema.validate('foo');
    expect(transform1).not.toHaveBeenCalled();
    expect(transform2).not.toHaveBeenCalled();
    expect(transform3).toHaveBeenCalledTimes(1);
    expect(transform3).toHaveBeenCalledWith('foo');
    expect(result).toBe('foo');
  });

  it('loses some type specific options/methods, but preserves generics', () => {
    const noop: (a: unknown) => undefined = () => undefined;
    const obj = schema.object({ a: schema.string() });
    noop(obj.extends);

    const transformedObj = obj.transform((v) => JSON.stringify(v, null, 2));
    // @ts-expect-error on the transformed type, we no longer have access to object type's `extend` method
    noop(transformedObj.extends);

    expectAssignable<TypeOf<typeof transformedObj>>({ a: 'foo' });
    expectAssignable<TypeOfOutput<typeof transformedObj>>(`{\n  "a": "foo"\n}`);
  });
});
