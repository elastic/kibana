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
class Inference {
    constructor(transport) {
        Object.defineProperty(this, "transport", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        this.transport = transport;
    }
    async delete(params, options) {
        const acceptedPath = ['task_type', 'inference_id'];
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
        let method = '';
        let path = '';
        if (params.task_type != null && params.inference_id != null) {
            method = 'DELETE';
            path = `/_inference/${encodeURIComponent(params.task_type.toString())}/${encodeURIComponent(params.inference_id.toString())}`;
        }
        else {
            method = 'DELETE';
            path = `/_inference/${encodeURIComponent(params.inference_id.toString())}`;
        }
        const meta = {
            name: 'inference.delete',
            pathParts: {
                task_type: params.task_type,
                inference_id: params.inference_id
            }
        };
        return await this.transport.request({ path, method, querystring, body, meta }, options);
    }
    async get(params, options) {
        const acceptedPath = ['task_type', 'inference_id'];
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
        if (params.task_type != null && params.inference_id != null) {
            method = 'GET';
            path = `/_inference/${encodeURIComponent(params.task_type.toString())}/${encodeURIComponent(params.inference_id.toString())}`;
        }
        else if (params.inference_id != null) {
            method = 'GET';
            path = `/_inference/${encodeURIComponent(params.inference_id.toString())}`;
        }
        else {
            method = 'GET';
            path = '/_inference';
        }
        const meta = {
            name: 'inference.get',
            pathParts: {
                task_type: params.task_type,
                inference_id: params.inference_id
            }
        };
        return await this.transport.request({ path, method, querystring, body, meta }, options);
    }
    async inference(params, options) {
        const acceptedPath = ['task_type', 'inference_id'];
        const acceptedBody = ['query', 'input', 'task_settings'];
        const querystring = {};
        // @ts-expect-error
        const userBody = params === null || params === void 0 ? void 0 : params.body;
        let body;
        if (typeof userBody === 'string') {
            body = userBody;
        }
        else {
            body = userBody != null ? { ...userBody } : undefined;
        }
        for (const key in params) {
            if (acceptedBody.includes(key)) {
                body = body !== null && body !== void 0 ? body : {};
                // @ts-expect-error
                body[key] = params[key];
            }
            else if (acceptedPath.includes(key)) {
                continue;
            }
            else if (key !== 'body') {
                // @ts-expect-error
                querystring[key] = params[key];
            }
        }
        let method = '';
        let path = '';
        if (params.task_type != null && params.inference_id != null) {
            method = 'POST';
            path = `/_inference/${encodeURIComponent(params.task_type.toString())}/${encodeURIComponent(params.inference_id.toString())}`;
        }
        else {
            method = 'POST';
            path = `/_inference/${encodeURIComponent(params.inference_id.toString())}`;
        }
        const meta = {
            name: 'inference.inference',
            pathParts: {
                task_type: params.task_type,
                inference_id: params.inference_id
            }
        };
        return await this.transport.request({ path, method, querystring, body, meta }, options);
    }
    async put(params, options) {
        var _a;
        const acceptedPath = ['task_type', 'inference_id'];
        const acceptedBody = ['inference_config'];
        const querystring = {};
        // @ts-expect-error
        let body = (_a = params.body) !== null && _a !== void 0 ? _a : undefined;
        for (const key in params) {
            if (acceptedBody.includes(key)) {
                // @ts-expect-error
                body = params[key];
            }
            else if (acceptedPath.includes(key)) {
                continue;
            }
            else if (key !== 'body') {
                // @ts-expect-error
                querystring[key] = params[key];
            }
        }
        let method = '';
        let path = '';
        if (params.task_type != null && params.inference_id != null) {
            method = 'PUT';
            path = `/_inference/${encodeURIComponent(params.task_type.toString())}/${encodeURIComponent(params.inference_id.toString())}`;
        }
        else {
            method = 'PUT';
            path = `/_inference/${encodeURIComponent(params.inference_id.toString())}`;
        }
        const meta = {
            name: 'inference.put',
            pathParts: {
                task_type: params.task_type,
                inference_id: params.inference_id
            }
        };
        return await this.transport.request({ path, method, querystring, body, meta }, options);
    }
}
exports.default = Inference;
//# sourceMappingURL=inference.js.map