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
test('required by default', () => {
    const type = __1.schema.conditional(__1.schema.contextRef('context_value_1'), __1.schema.contextRef('context_value_2'), __1.schema.string(), __1.schema.string());
    expect(() => type.validate(undefined, {
        context_value_1: 0,
        context_value_2: 0,
    })).toThrowErrorMatchingSnapshot();
});
test('returns default', () => {
    const type = __1.schema.conditional(__1.schema.contextRef('context_value_1'), __1.schema.contextRef('context_value_2'), __1.schema.string(), __1.schema.string(), {
        defaultValue: 'unknown',
    });
    expect(type.validate(undefined, {
        context_value_1: 0,
        context_value_2: 0,
    })).toEqual('unknown');
});
test('properly handles nested types with defaults', () => {
    const type = __1.schema.conditional(__1.schema.contextRef('context_value_1'), __1.schema.contextRef('context_value_2'), __1.schema.string({ defaultValue: 'equal' }), __1.schema.string({ defaultValue: 'not equal' }));
    expect(type.validate(undefined, {
        context_value_1: 0,
        context_value_2: 0,
    })).toEqual('equal');
    expect(type.validate(undefined, {
        context_value_1: 0,
        context_value_2: 1,
    })).toEqual('not equal');
});
test('properly validates types according chosen schema', () => {
    const type = __1.schema.conditional(__1.schema.contextRef('context_value_1'), __1.schema.contextRef('context_value_2'), __1.schema.string({ minLength: 2 }), __1.schema.string({ maxLength: 1 }));
    expect(() => type.validate('a', {
        context_value_1: 0,
        context_value_2: 0,
    })).toThrowErrorMatchingSnapshot();
    expect(type.validate('ab', {
        context_value_1: 0,
        context_value_2: 0,
    })).toEqual('ab');
    expect(() => type.validate('ab', {
        context_value_1: 0,
        context_value_2: 1,
    })).toThrowErrorMatchingSnapshot();
    expect(type.validate('a', {
        context_value_1: 0,
        context_value_2: 1,
    })).toEqual('a');
});
test('properly validates when compares with Schema', () => {
    const type = __1.schema.conditional(__1.schema.contextRef('context_value_1'), __1.schema.number(), __1.schema.string({ minLength: 2 }), __1.schema.string({ minLength: 3 }));
    expect(() => type.validate('a', {
        context_value_1: 0,
    })).toThrowErrorMatchingSnapshot();
    expect(type.validate('ab', {
        context_value_1: 0,
    })).toEqual('ab');
    expect(() => type.validate('ab', {
        context_value_1: 'b',
    })).toThrowErrorMatchingSnapshot();
    expect(type.validate('abc', {
        context_value_1: 'b',
    })).toEqual('abc');
});
test('properly validates when compares with "null" literal Schema', () => {
    const type = __1.schema.conditional(__1.schema.contextRef('context_value_1'), __1.schema.literal(null), __1.schema.string({ minLength: 2 }), __1.schema.string({ minLength: 3 }));
    expect(() => type.validate('a', {
        context_value_1: null,
    })).toThrowErrorMatchingSnapshot();
    expect(type.validate('ab', {
        context_value_1: null,
    })).toEqual('ab');
    expect(() => type.validate('ab', {
        context_value_1: 'b',
    })).toThrowErrorMatchingSnapshot();
    expect(type.validate('abc', {
        context_value_1: 'b',
    })).toEqual('abc');
});
test('properly handles schemas with incompatible types', () => {
    const type = __1.schema.conditional(__1.schema.contextRef('context_value_1'), __1.schema.contextRef('context_value_2'), __1.schema.string(), __1.schema.boolean());
    expect(() => type.validate(true, {
        context_value_1: 0,
        context_value_2: 0,
    })).toThrowErrorMatchingSnapshot();
    expect(type.validate('a', {
        context_value_1: 0,
        context_value_2: 0,
    })).toEqual('a');
    expect(() => type.validate('a', {
        context_value_1: 0,
        context_value_2: 1,
    })).toThrowErrorMatchingSnapshot();
    expect(type.validate(true, {
        context_value_1: 0,
        context_value_2: 1,
    })).toEqual(true);
});
test('properly handles conditionals within objects', () => {
    const type = __1.schema.object({
        key: __1.schema.string(),
        value: __1.schema.conditional(__1.schema.siblingRef('key'), 'number', __1.schema.number(), __1.schema.string()),
    });
    expect(() => type.validate({ key: 'string', value: 1 })).toThrowErrorMatchingSnapshot();
    expect(type.validate({ key: 'string', value: 'a' })).toEqual({
        key: 'string',
        value: 'a',
    });
    expect(() => type.validate({ key: 'number', value: 'a' })).toThrowErrorMatchingSnapshot();
    expect(type.validate({ key: 'number', value: 1 })).toEqual({
        key: 'number',
        value: 1,
    });
});
test('properly handled within `maybe`', () => {
    const type = __1.schema.object({
        key: __1.schema.string(),
        value: __1.schema.maybe(__1.schema.conditional(__1.schema.siblingRef('key'), 'number', __1.schema.number(), __1.schema.string())),
    });
    expect(type.validate({ key: 'string' })).toEqual({
        key: 'string',
    });
    expect(type.validate({ key: 'number', value: 1 })).toEqual({
        key: 'number',
        value: 1,
    });
});
test('works with both context and sibling references', () => {
    const type = __1.schema.object({
        key: __1.schema.string(),
        value: __1.schema.conditional(__1.schema.siblingRef('key'), __1.schema.contextRef('context_key'), __1.schema.number(), __1.schema.string()),
    });
    expect(() => type.validate({ key: 'string', value: 1 }, { context_key: 'number' })).toThrowErrorMatchingSnapshot();
    expect(type.validate({ key: 'string', value: 'a' }, { context_key: 'number' })).toEqual({
        key: 'string',
        value: 'a',
    });
    expect(() => type.validate({ key: 'number', value: 'a' }, { context_key: 'number' })).toThrowErrorMatchingSnapshot();
    expect(type.validate({ key: 'number', value: 1 }, { context_key: 'number' })).toEqual({
        key: 'number',
        value: 1,
    });
});
test('includes namespace into failures', () => {
    const type = __1.schema.object({
        key: __1.schema.string(),
        value: __1.schema.conditional(__1.schema.siblingRef('key'), 'number', __1.schema.number(), __1.schema.string()),
    });
    expect(() => type.validate({ key: 'string', value: 1 }, {}, 'mega-namespace')).toThrowErrorMatchingSnapshot();
    expect(() => type.validate({ key: 'number', value: 'a' }, {}, 'mega-namespace')).toThrowErrorMatchingSnapshot();
});
test('correctly handles missing references', () => {
    const type = __1.schema.object({
        value: __1.schema.conditional(__1.schema.siblingRef('missing-key'), 'number', __1.schema.number(), __1.schema.string()),
    });
    expect(() => type.validate({ value: 1 })).toThrowErrorMatchingSnapshot();
    expect(type.validate({ value: 'a' })).toEqual({ value: 'a' });
});
test('works within `oneOf`', () => {
    const type = __1.schema.oneOf([
        __1.schema.conditional(__1.schema.contextRef('type'), 'number', __1.schema.number(), __1.schema.string()),
        __1.schema.conditional(__1.schema.contextRef('type'), 'boolean', __1.schema.boolean(), __1.schema.arrayOf(__1.schema.string())),
    ]);
    expect(type.validate(1, { type: 'number' })).toEqual(1);
    expect(type.validate('1', { type: 'string' })).toEqual('1');
    expect(type.validate(true, { type: 'boolean' })).toEqual(true);
    expect(type.validate(['a', 'b'], { type: 'array' })).toEqual(['a', 'b']);
    expect(() => type.validate(1, { type: 'string' })).toThrowErrorMatchingSnapshot();
    expect(() => type.validate(true, { type: 'string' })).toThrowErrorMatchingSnapshot();
});
describe('#validate', () => {
    test('is called after all content is processed', () => {
        const mockValidate = jest.fn();
        const type = __1.schema.object({
            key: __1.schema.string(),
            value: __1.schema.conditional(__1.schema.siblingRef('key'), 'number', __1.schema.number({ defaultValue: 100 }), __1.schema.string({ defaultValue: 'some-string' })),
        }, {
            validate: mockValidate,
        });
        type.validate({ key: 'number' });
        expect(mockValidate).toHaveBeenCalledWith({
            key: 'number',
            value: 100,
        });
        mockValidate.mockClear();
        type.validate({ key: 'not-number' });
        expect(mockValidate).toHaveBeenCalledWith({
            key: 'not-number',
            value: 'some-string',
        });
    });
});
