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
const internals_1 = require("../internals");
class Reference {
    constructor(key) {
        this.internalSchema = internals_1.internals.ref(key);
    }
    static isReference(value) {
        return (value != null &&
            typeof value.getSchema === 'function' &&
            internals_1.internals.isRef(value.getSchema()));
    }
    getSchema() {
        return this.internalSchema;
    }
}
exports.Reference = Reference;
