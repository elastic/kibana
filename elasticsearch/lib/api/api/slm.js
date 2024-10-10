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
class Slm {
    constructor(transport) {
        Object.defineProperty(this, "transport", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        this.transport = transport;
    }
    async deleteLifecycle(params, options) {
        const acceptedPath = ['policy_id'];
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
        const path = `/_slm/policy/${encodeURIComponent(params.policy_id.toString())}`;
        const meta = {
            name: 'slm.delete_lifecycle',
            pathParts: {
                policy_id: params.policy_id
            }
        };
        return await this.transport.request({ path, method, querystring, body, meta }, options);
    }
    async executeLifecycle(params, options) {
        const acceptedPath = ['policy_id'];
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
        const method = 'PUT';
        const path = `/_slm/policy/${encodeURIComponent(params.policy_id.toString())}/_execute`;
        const meta = {
            name: 'slm.execute_lifecycle',
            pathParts: {
                policy_id: params.policy_id
            }
        };
        return await this.transport.request({ path, method, querystring, body, meta }, options);
    }
    async executeRetention(params, options) {
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
        const method = 'POST';
        const path = '/_slm/_execute_retention';
        const meta = {
            name: 'slm.execute_retention'
        };
        return await this.transport.request({ path, method, querystring, body, meta }, options);
    }
    async getLifecycle(params, options) {
        const acceptedPath = ['policy_id'];
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
        if (params.policy_id != null) {
            method = 'GET';
            path = `/_slm/policy/${encodeURIComponent(params.policy_id.toString())}`;
        }
        else {
            method = 'GET';
            path = '/_slm/policy';
        }
        const meta = {
            name: 'slm.get_lifecycle',
            pathParts: {
                policy_id: params.policy_id
            }
        };
        return await this.transport.request({ path, method, querystring, body, meta }, options);
    }
    async getStats(params, options) {
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
        const path = '/_slm/stats';
        const meta = {
            name: 'slm.get_stats'
        };
        return await this.transport.request({ path, method, querystring, body, meta }, options);
    }
    async getStatus(params, options) {
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
        const path = '/_slm/status';
        const meta = {
            name: 'slm.get_status'
        };
        return await this.transport.request({ path, method, querystring, body, meta }, options);
    }
    async putLifecycle(params, options) {
        const acceptedPath = ['policy_id'];
        const acceptedBody = ['config', 'name', 'repository', 'retention', 'schedule'];
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
        const method = 'PUT';
        const path = `/_slm/policy/${encodeURIComponent(params.policy_id.toString())}`;
        const meta = {
            name: 'slm.put_lifecycle',
            pathParts: {
                policy_id: params.policy_id
            }
        };
        return await this.transport.request({ path, method, querystring, body, meta }, options);
    }
    async start(params, options) {
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
        const method = 'POST';
        const path = '/_slm/start';
        const meta = {
            name: 'slm.start'
        };
        return await this.transport.request({ path, method, querystring, body, meta }, options);
    }
    async stop(params, options) {
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
        const method = 'POST';
        const path = '/_slm/stop';
        const meta = {
            name: 'slm.stop'
        };
        return await this.transport.request({ path, method, querystring, body, meta }, options);
    }
}
exports.default = Slm;
//# sourceMappingURL=slm.js.map