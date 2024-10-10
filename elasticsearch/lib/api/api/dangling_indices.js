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
class DanglingIndices {
    constructor(transport) {
        Object.defineProperty(this, "transport", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        this.transport = transport;
    }
    async deleteDanglingIndex(params, options) {
        const acceptedPath = ['index_uuid'];
        const querystring = {};
        const body = undefined;
        for (const key in params) {
            if (acceptedPath.includes(key)) {
                continue;
            }
            else if (key !== 'body') {
                // @ts-expect-error
                querystring[key] = params[key];
            }
        }
        const method = 'DELETE';
        const path = `/_dangling/${encodeURIComponent(params.index_uuid.toString())}`;
        const meta = {
            name: 'dangling_indices.delete_dangling_index',
            pathParts: {
                index_uuid: params.index_uuid
            }
        };
        return await this.transport.request({ path, method, querystring, body, meta }, options);
    }
    async importDanglingIndex(params, options) {
        const acceptedPath = ['index_uuid'];
        const querystring = {};
        const body = undefined;
        for (const key in params) {
            if (acceptedPath.includes(key)) {
                continue;
            }
            else if (key !== 'body') {
                // @ts-expect-error
                querystring[key] = params[key];
            }
        }
        const method = 'POST';
        const path = `/_dangling/${encodeURIComponent(params.index_uuid.toString())}`;
        const meta = {
            name: 'dangling_indices.import_dangling_index',
            pathParts: {
                index_uuid: params.index_uuid
            }
        };
        return await this.transport.request({ path, method, querystring, body, meta }, options);
    }
    async listDanglingIndices(params, options) {
        const acceptedPath = [];
        const querystring = {};
        const body = undefined;
        params = params !== null && params !== void 0 ? params : {};
        for (const key in params) {
            if (acceptedPath.includes(key)) {
                continue;
            }
            else if (key !== 'body') {
                // @ts-expect-error
                querystring[key] = params[key];
            }
        }
        const method = 'GET';
        const path = '/_dangling';
        const meta = {
            name: 'dangling_indices.list_dangling_indices'
        };
        return await this.transport.request({ path, method, querystring, body, meta }, options);
    }
}
exports.default = DanglingIndices;
//# sourceMappingURL=dangling_indices.js.map