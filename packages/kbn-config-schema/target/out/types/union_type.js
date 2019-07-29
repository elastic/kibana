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
const errors_1 = require("../errors");
const internals_1 = require("../internals");
const type_1 = require("./type");
class UnionType extends type_1.Type {
    constructor(types, options) {
        const schema = internals_1.internals.alternatives(types.map(type => type.getSchema()));
        super(schema, options);
    }
    handleError(type, { reason, value }, path) {
        switch (type) {
            case 'any.required':
                return `expected at least one defined value but got [${type_detect_1.default(value)}]`;
            case 'alternatives.child':
                return new errors_1.SchemaTypesError('types that failed validation:', path, reason.map((e, index) => {
                    const childPathWithIndex = e.path.slice();
                    childPathWithIndex.splice(path.length, 0, index.toString());
                    return new errors_1.SchemaTypeError(e.message, childPathWithIndex);
                }));
        }
    }
}
exports.UnionType = UnionType;
