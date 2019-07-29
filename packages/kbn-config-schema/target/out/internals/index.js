"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
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
const joi_1 = tslib_1.__importDefault(require("joi"));
const lodash_1 = require("lodash");
const moment_1 = require("moment");
const byte_size_value_1 = require("../byte_size_value");
const duration_1 = require("../duration");
function isMap(o) {
    return o instanceof Map;
}
const anyCustomRule = {
    name: 'custom',
    params: {
        validator: joi_1.default.func()
            .maxArity(1)
            .required(),
    },
    validate(params, value, state, options) {
        let validationResultMessage;
        try {
            validationResultMessage = params.validator(value);
        }
        catch (e) {
            validationResultMessage = e.message || e;
        }
        if (typeof validationResultMessage === 'string') {
            return this.createError('any.custom', { value, message: validationResultMessage }, state, options);
        }
        return value;
    },
};
/**
 * @internal
 */
exports.internals = joi_1.default.extend([
    {
        name: 'any',
        rules: [anyCustomRule],
    },
    {
        name: 'boolean',
        base: joi_1.default.boolean(),
        coerce(value, state, options) {
            // If value isn't defined, let Joi handle default value if it's defined.
            if (value !== undefined && typeof value !== 'boolean') {
                return this.createError('boolean.base', { value }, state, options);
            }
            return value;
        },
        rules: [anyCustomRule],
    },
    {
        name: 'string',
        base: joi_1.default.string(),
        rules: [anyCustomRule],
    },
    {
        name: 'bytes',
        coerce(value, state, options) {
            try {
                if (typeof value === 'string') {
                    return byte_size_value_1.ByteSizeValue.parse(value);
                }
                if (typeof value === 'number') {
                    return new byte_size_value_1.ByteSizeValue(value);
                }
            }
            catch (e) {
                return this.createError('bytes.parse', { value, message: e.message }, state, options);
            }
            return value;
        },
        pre(value, state, options) {
            // If value isn't defined, let Joi handle default value if it's defined.
            if (value instanceof byte_size_value_1.ByteSizeValue) {
                return value;
            }
            return this.createError('bytes.base', { value }, state, options);
        },
        rules: [
            anyCustomRule,
            {
                name: 'min',
                params: {
                    limit: joi_1.default.alternatives([joi_1.default.number(), joi_1.default.string()]).required(),
                },
                validate(params, value, state, options) {
                    const limit = byte_size_value_1.ensureByteSizeValue(params.limit);
                    if (value.isLessThan(limit)) {
                        return this.createError('bytes.min', { value, limit }, state, options);
                    }
                    return value;
                },
            },
            {
                name: 'max',
                params: {
                    limit: joi_1.default.alternatives([joi_1.default.number(), joi_1.default.string()]).required(),
                },
                validate(params, value, state, options) {
                    const limit = byte_size_value_1.ensureByteSizeValue(params.limit);
                    if (value.isGreaterThan(limit)) {
                        return this.createError('bytes.max', { value, limit }, state, options);
                    }
                    return value;
                },
            },
        ],
    },
    {
        name: 'duration',
        coerce(value, state, options) {
            try {
                if (typeof value === 'string' || typeof value === 'number') {
                    return duration_1.ensureDuration(value);
                }
            }
            catch (e) {
                return this.createError('duration.parse', { value, message: e.message }, state, options);
            }
            return value;
        },
        pre(value, state, options) {
            if (!moment_1.isDuration(value)) {
                return this.createError('duration.base', { value }, state, options);
            }
            return value;
        },
        rules: [anyCustomRule],
    },
    {
        name: 'number',
        base: joi_1.default.number(),
        coerce(value, state, options) {
            // If value isn't defined, let Joi handle default value if it's defined.
            if (value === undefined) {
                return value;
            }
            // Do we want to allow strings that can be converted, e.g. "2"? (Joi does)
            // (this can for example be nice in http endpoints with query params)
            //
            // From Joi docs on `Joi.number`:
            // > Generates a schema object that matches a number data type (as well as
            // > strings that can be converted to numbers)
            const coercedValue = typeof value === 'string' ? Number(value) : value;
            if (typeof coercedValue !== 'number' || isNaN(coercedValue)) {
                return this.createError('number.base', { value }, state, options);
            }
            return value;
        },
        rules: [anyCustomRule],
    },
    {
        name: 'object',
        base: joi_1.default.object(),
        coerce(value, state, options) {
            // If value isn't defined, let Joi handle default value if it's defined.
            if (value !== undefined && !lodash_1.isPlainObject(value)) {
                return this.createError('object.base', { value }, state, options);
            }
            return value;
        },
        rules: [anyCustomRule],
    },
    {
        name: 'map',
        coerce(value, state, options) {
            if (lodash_1.isPlainObject(value)) {
                return new Map(Object.entries(value));
            }
            return value;
        },
        pre(value, state, options) {
            if (!isMap(value)) {
                return this.createError('map.base', { value }, state, options);
            }
            return value;
        },
        rules: [
            anyCustomRule,
            {
                name: 'entries',
                params: {
                    key: joi_1.default.object().schema(),
                    value: joi_1.default.object().schema(),
                },
                validate(params, value, state, options) {
                    const result = new Map();
                    for (const [entryKey, entryValue] of value) {
                        const { value: validatedEntryKey, error: keyError } = joi_1.default.validate(entryKey, params.key);
                        if (keyError) {
                            return this.createError('map.key', { entryKey, reason: keyError }, state, options);
                        }
                        const { value: validatedEntryValue, error: valueError } = joi_1.default.validate(entryValue, params.value);
                        if (valueError) {
                            return this.createError('map.value', { entryKey, reason: valueError }, state, options);
                        }
                        result.set(validatedEntryKey, validatedEntryValue);
                    }
                    return result;
                },
            },
        ],
    },
    {
        name: 'record',
        pre(value, state, options) {
            if (!lodash_1.isPlainObject(value)) {
                return this.createError('record.base', { value }, state, options);
            }
            return value;
        },
        rules: [
            anyCustomRule,
            {
                name: 'entries',
                params: { key: joi_1.default.object().schema(), value: joi_1.default.object().schema() },
                validate(params, value, state, options) {
                    const result = {};
                    for (const [entryKey, entryValue] of Object.entries(value)) {
                        const { value: validatedEntryKey, error: keyError } = joi_1.default.validate(entryKey, params.key);
                        if (keyError) {
                            return this.createError('record.key', { entryKey, reason: keyError }, state, options);
                        }
                        const { value: validatedEntryValue, error: valueError } = joi_1.default.validate(entryValue, params.value);
                        if (valueError) {
                            return this.createError('record.value', { entryKey, reason: valueError }, state, options);
                        }
                        result[validatedEntryKey] = validatedEntryValue;
                    }
                    return result;
                },
            },
        ],
    },
    {
        name: 'array',
        base: joi_1.default.array(),
        coerce(value, state, options) {
            // If value isn't defined, let Joi handle default value if it's defined.
            if (value !== undefined && !Array.isArray(value)) {
                return this.createError('array.base', { value }, state, options);
            }
            return value;
        },
        rules: [anyCustomRule],
    },
]);
