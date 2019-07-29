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
const internals_1 = require("../internals");
const type_1 = require("./type");
class NumberType extends type_1.Type {
    constructor(options = {}) {
        let schema = internals_1.internals.number();
        if (options.min !== undefined) {
            schema = schema.min(options.min);
        }
        if (options.max !== undefined) {
            schema = schema.max(options.max);
        }
        super(schema, options);
    }
    handleError(type, { limit, value }) {
        switch (type) {
            case 'any.required':
            case 'number.base':
                return `expected value of type [number] but got [${type_detect_1.default(value)}]`;
            case 'number.min':
                return `Value is [${value}] but it must be equal to or greater than [${limit}].`;
            case 'number.max':
                return `Value is [${value}] but it must be equal to or lower than [${limit}].`;
        }
    }
}
exports.NumberType = NumberType;
