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
test('handles object as input', () => {
    const type = __1.schema.recordOf(__1.schema.string(), __1.schema.string());
    const value = {
        name: 'foo',
    };
    expect(type.validate(value)).toEqual({ name: 'foo' });
});
test('fails when not receiving expected value type', () => {
    const type = __1.schema.recordOf(__1.schema.string(), __1.schema.string());
    const value = {
        name: 123,
    };
    expect(() => type.validate(value)).toThrowErrorMatchingInlineSnapshot(`"[name]: expected value of type [string] but got [number]"`);
});
test('fails when not receiving expected key type', () => {
    const type = __1.schema.recordOf(__1.schema.oneOf([__1.schema.literal('nickName'), __1.schema.literal('lastName')]), __1.schema.string());
    const value = {
        name: 'foo',
    };
    expect(() => type.validate(value)).toThrowErrorMatchingInlineSnapshot(`
"[key(\\"name\\")]: types that failed validation:
- [0]: expected value to equal [nickName] but got [name]
- [1]: expected value to equal [lastName] but got [name]"
`);
});
test('includes namespace in failure when wrong top-level type', () => {
    const type = __1.schema.recordOf(__1.schema.string(), __1.schema.string());
    expect(() => type.validate([], {}, 'foo-namespace')).toThrowErrorMatchingInlineSnapshot(`"[foo-namespace]: expected value of type [object] but got [Array]"`);
});
test('includes namespace in failure when wrong value type', () => {
    const type = __1.schema.recordOf(__1.schema.string(), __1.schema.string());
    const value = {
        name: 123,
    };
    expect(() => type.validate(value, {}, 'foo-namespace')).toThrowErrorMatchingInlineSnapshot(`"[foo-namespace.name]: expected value of type [string] but got [number]"`);
});
test('includes namespace in failure when wrong key type', () => {
    const type = __1.schema.recordOf(__1.schema.string({ minLength: 10 }), __1.schema.string());
    const value = {
        name: 'foo',
    };
    expect(() => type.validate(value, {}, 'foo-namespace')).toThrowErrorMatchingInlineSnapshot(`"[foo-namespace.key(\\"name\\")]: value is [name] but it must have a minimum length of [10]."`);
});
test('returns default value if undefined', () => {
    const obj = { foo: 'bar' };
    const type = __1.schema.recordOf(__1.schema.string(), __1.schema.string(), {
        defaultValue: obj,
    });
    expect(type.validate(undefined)).toEqual(obj);
});
test('recordOf within recordOf', () => {
    const type = __1.schema.recordOf(__1.schema.string(), __1.schema.recordOf(__1.schema.string(), __1.schema.number()));
    const value = {
        foo: {
            bar: 123,
        },
    };
    expect(type.validate(value)).toEqual({ foo: { bar: 123 } });
});
test('object within recordOf', () => {
    const type = __1.schema.recordOf(__1.schema.string(), __1.schema.object({
        bar: __1.schema.number(),
    }));
    const value = {
        foo: {
            bar: 123,
        },
    };
    expect(type.validate(value)).toEqual({ foo: { bar: 123 } });
});
