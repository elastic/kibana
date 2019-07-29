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
const duration_1 = require("../duration");
const errors_1 = require("../errors");
const internals_1 = require("../internals");
const type_1 = require("./type");
class DurationType extends type_1.Type {
    constructor(options = {}) {
        let defaultValue;
        if (typeof options.defaultValue === 'function') {
            const originalDefaultValue = options.defaultValue;
            defaultValue = () => duration_1.ensureDuration(originalDefaultValue());
        }
        else if (typeof options.defaultValue === 'string' ||
            typeof options.defaultValue === 'number') {
            defaultValue = duration_1.ensureDuration(options.defaultValue);
        }
        else {
            defaultValue = options.defaultValue;
        }
        super(internals_1.internals.duration(), { ...options, defaultValue });
    }
    handleError(type, { message, value }, path) {
        switch (type) {
            case 'any.required':
            case 'duration.base':
                return `expected value of type [moment.Duration] but got [${type_detect_1.default(value)}]`;
            case 'duration.parse':
                return new errors_1.SchemaTypeError(message, path);
        }
    }
}
exports.DurationType = DurationType;
