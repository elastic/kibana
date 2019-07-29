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
const tslib_1 = require("tslib");
const type_detect_1 = tslib_1.__importDefault(require("type-detect"));
const byte_size_value_1 = require("../byte_size_value");
const errors_1 = require("../errors");
const internals_1 = require("../internals");
const type_1 = require("./type");
class ByteSizeType extends type_1.Type {
    constructor(options = {}) {
        let schema = internals_1.internals.bytes();
        if (options.min !== undefined) {
            schema = schema.min(options.min);
        }
        if (options.max !== undefined) {
            schema = schema.max(options.max);
        }
        super(schema, {
            defaultValue: byte_size_value_1.ensureByteSizeValue(options.defaultValue),
            validate: options.validate,
        });
    }
    handleError(type, { limit, message, value }, path) {
        switch (type) {
            case 'any.required':
            case 'bytes.base':
                return `expected value of type [ByteSize] but got [${type_detect_1.default(value)}]`;
            case 'bytes.parse':
                return new errors_1.SchemaTypeError(message, path);
            case 'bytes.min':
                return `Value is [${value.toString()}] ([${value.toString('b')}]) but it must be equal to or greater than [${limit.toString()}]`;
            case 'bytes.max':
                return `Value is [${value.toString()}] ([${value.toString('b')}]) but it must be equal to or less than [${limit.toString()}]`;
        }
    }
}
exports.ByteSizeType = ByteSizeType;
