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
const errors_1 = require("../errors");
class ObjectType extends type_1.Type {
    constructor(props, options = {}) {
        const schemaKeys = {};
        for (const [key, value] of Object.entries(props)) {
            schemaKeys[key] = value.getSchema();
        }
        const { allowUnknowns, ...typeOptions } = options;
        const schema = internals_1.internals
            .object()
            .keys(schemaKeys)
            .optional()
            .default()
            .unknown(Boolean(allowUnknowns));
        super(schema, typeOptions);
        this.props = schemaKeys;
    }
    handleError(type, { reason, value }) {
        switch (type) {
            case 'any.required':
            case 'object.base':
                return `expected a plain object value, but found [${type_detect_1.default(value)}] instead.`;
            case 'object.allowUnknown':
                return `definition for this key is missing`;
            case 'object.child':
                return reason[0];
        }
    }
    validateKey(key, value) {
        if (!this.props[key]) {
            throw new Error(`${key} is not a valid part of this schema`);
        }
        const { value: validatedValue, error } = this.props[key].validate(value);
        if (error) {
            throw new errors_1.ValidationError(error, key);
        }
        return validatedValue;
    }
}
exports.ObjectType = ObjectType;
