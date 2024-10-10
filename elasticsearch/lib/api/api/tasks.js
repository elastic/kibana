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
class Tasks {
    constructor(transport) {
        Object.defineProperty(this, "transport", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        this.transport = transport;
    }
    async cancel(params, options) {
        const acceptedPath = ['task_id'];
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
        let method = '';
        let path = '';
        if (params.task_id != null) {
            method = 'POST';
            path = `/_tasks/${encodeURIComponent(params.task_id.toString())}/_cancel`;
        }
        else {
            method = 'POST';
            path = '/_tasks/_cancel';
        }
        const meta = {
            name: 'tasks.cancel',
            pathParts: {
                task_id: params.task_id
            }
        };
        return await this.transport.request({ path, method, querystring, body, meta }, options);
    }
    async get(params, options) {
        const acceptedPath = ['task_id'];
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
        const method = 'GET';
        const path = `/_tasks/${encodeURIComponent(params.task_id.toString())}`;
        const meta = {
            name: 'tasks.get',
            pathParts: {
                task_id: params.task_id
            }
        };
        return await this.transport.request({ path, method, querystring, body, meta }, options);
    }
    async list(params, options) {
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
        const path = '/_tasks';
        const meta = {
            name: 'tasks.list'
        };
        return await this.transport.request({ path, method, querystring, body, meta }, options);
    }
}
exports.default = Tasks;
//# sourceMappingURL=tasks.js.map