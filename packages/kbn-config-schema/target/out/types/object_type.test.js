"use strict";
/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const __1 = require("..");
test('returns value by default', () => {
    const type = __1.schema.object({
        name: __1.schema.string(),
    });
    const value = {
        name: 'test',
    };
    expect(type.validate(value)).toEqual({ name: 'test' });
});
test('fails if missing required value', () => {
    const type = __1.schema.object({
        name: __1.schema.string(),
    });
    const value = {};
    expect(() => type.validate(value)).toThrowErrorMatchingSnapshot();
});
test('returns value if undefined string with default', () => {
    const type = __1.schema.object({
        name: __1.schema.string({ defaultValue: 'test' }),
    });
    const value = {};
    expect(type.validate(value)).toEqual({ name: 'test' });
});
test('fails if key does not exist in schema', () => {
    const type = __1.schema.object({
        foo: __1.schema.string(),
    });
    const value = {
        bar: 'baz',
        foo: 'bar',
    };
    expect(() => type.validate(value)).toThrowErrorMatchingSnapshot();
});
test('defined object within object', () => {
    const type = __1.schema.object({
        foo: __1.schema.object({
            bar: __1.schema.string({ defaultValue: 'hello world' }),
        }),
    });
    expect(type.validate({ foo: {} })).toEqual({
        foo: {
            bar: 'hello world',
        },
    });
});
test('undefined object within object', () => {
    const type = __1.schema.object({
        foo: __1.schema.object({
            bar: __1.schema.string({ defaultValue: 'hello world' }),
        }),
    });
    expect(type.validate({})).toEqual({
        foo: {
            bar: 'hello world',
        },
    });
});
test('object within object with required', () => {
    const type = __1.schema.object({
        foo: __1.schema.object({
            bar: __1.schema.string(),
        }),
    });
    const value = { foo: {} };
    expect(() => type.validate(value)).toThrowErrorMatchingSnapshot();
});
describe('#validate', () => {
    test('is called after all content is processed', () => {
        const mockValidate = jest.fn();
        const type = __1.schema.object({
            foo: __1.schema.object({
                bar: __1.schema.string({ defaultValue: 'baz' }),
            }),
        }, {
            validate: mockValidate,
        });
        type.validate({ foo: {} });
        expect(mockValidate).toHaveBeenCalledWith({
            foo: {
                bar: 'baz',
            },
        });
    });
});
test('called with wrong type', () => {
    const type = __1.schema.object({});
    expect(() => type.validate('foo')).toThrowErrorMatchingSnapshot();
    expect(() => type.validate(123)).toThrowErrorMatchingSnapshot();
});
test('handles oneOf', () => {
    const type = __1.schema.object({
        key: __1.schema.oneOf([__1.schema.string()]),
    });
    expect(type.validate({ key: 'foo' })).toEqual({ key: 'foo' });
    expect(() => type.validate({ key: 123 })).toThrowErrorMatchingSnapshot();
});
test('handles references', () => {
    const type = __1.schema.object({
        context: __1.schema.string({
            defaultValue: __1.schema.contextRef('context_value'),
        }),
        key: __1.schema.string(),
        value: __1.schema.string({ defaultValue: __1.schema.siblingRef('key') }),
    });
    expect(type.validate({ key: 'key#1' }, { context_value: 'context#1' })).toEqual({
        context: 'context#1',
        key: 'key#1',
        value: 'key#1',
    });
    expect(type.validate({ key: 'key#1', value: 'value#1' })).toEqual({
        key: 'key#1',
        value: 'value#1',
    });
});
test('handles conditionals', () => {
    const type = __1.schema.object({
        key: __1.schema.string(),
        value: __1.schema.conditional(__1.schema.siblingRef('key'), 'some-key', __1.schema.string({ defaultValue: 'some-value' }), __1.schema.string({ defaultValue: 'unknown-value' })),
    });
    expect(type.validate({ key: 'some-key' })).toEqual({
        key: 'some-key',
        value: 'some-value',
    });
    expect(type.validate({ key: 'another-key' })).toEqual({
        key: 'another-key',
        value: 'unknown-value',
    });
});
test('includes namespace in failure when wrong top-level type', () => {
    const type = __1.schema.object({
        foo: __1.schema.string(),
    });
    expect(() => type.validate([], {}, 'foo-namespace')).toThrowErrorMatchingSnapshot();
});
test('includes namespace in failure when wrong value type', () => {
    const type = __1.schema.object({
        foo: __1.schema.string(),
    });
    const value = {
        foo: 123,
    };
    expect(() => type.validate(value, {}, 'foo-namespace')).toThrowErrorMatchingSnapshot();
});
test('individual keys can validated', () => {
    const type = __1.schema.object({
        foo: __1.schema.boolean(),
    });
    const value = false;
    expect(() => type.validateKey('foo', value)).not.toThrowError();
    expect(() => type.validateKey('bar', '')).toThrowErrorMatchingInlineSnapshot(`"bar is not a valid part of this schema"`);
});
test('allow unknown keys when allowUnknowns = true', () => {
    const type = __1.schema.object({ foo: __1.schema.string({ defaultValue: 'test' }) }, { allowUnknowns: true });
    expect(type.validate({
        bar: 'baz',
    })).toEqual({
        foo: 'test',
        bar: 'baz',
    });
});
test('allowUnknowns = true affects only own keys', () => {
    const type = __1.schema.object({ foo: __1.schema.object({ bar: __1.schema.string() }) }, { allowUnknowns: true });
    expect(() => type.validate({
        foo: {
            bar: 'bar',
            baz: 'baz',
        },
    })).toThrowErrorMatchingSnapshot();
});
test('does not allow unknown keys when allowUnknowns = false', () => {
    const type = __1.schema.object({ foo: __1.schema.string({ defaultValue: 'test' }) }, { allowUnknowns: false });
    expect(() => type.validate({
        bar: 'baz',
    })).toThrowErrorMatchingSnapshot();
});
