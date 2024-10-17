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
class Ilm {
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
        const acceptedPath = ['name'];
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
        const path = `/_ilm/policy/${encodeURIComponent(params.name.toString())}`;
        const meta = {
            name: 'ilm.delete_lifecycle',
            pathParts: {
                name: params.name
            }
        };
        return await this.transport.request({ path, method, querystring, body, meta }, options);
    }
    async explainLifecycle(params, options) {
        const acceptedPath = ['index'];
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
        const path = `/${encodeURIComponent(params.index.toString())}/_ilm/explain`;
        const meta = {
            name: 'ilm.explain_lifecycle',
            pathParts: {
                index: params.index
            }
        };
        return await this.transport.request({ path, method, querystring, body, meta }, options);
    }
    async getLifecycle(params, options) {
        const acceptedPath = ['name'];
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
        if (params.name != null) {
            method = 'GET';
            path = `/_ilm/policy/${encodeURIComponent(params.name.toString())}`;
        }
        else {
            method = 'GET';
            path = '/_ilm/policy';
        }
        const meta = {
            name: 'ilm.get_lifecycle',
            pathParts: {
                name: params.name
            }
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
        const path = '/_ilm/status';
        const meta = {
            name: 'ilm.get_status'
        };
        return await this.transport.request({ path, method, querystring, body, meta }, options);
    }
    async migrateToDataTiers(params, options) {
        const acceptedPath = [];
        const acceptedBody = ['legacy_template_to_delete', 'node_attribute'];
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
        params = params !== null && params !== void 0 ? params : {};
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
        const method = 'POST';
        const path = '/_ilm/migrate_to_data_tiers';
        const meta = {
            name: 'ilm.migrate_to_data_tiers'
        };
        return await this.transport.request({ path, method, querystring, body, meta }, options);
    }
    async moveToStep(params, options) {
        const acceptedPath = ['index'];
        const acceptedBody = ['current_step', 'next_step'];
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
        const method = 'POST';
        const path = `/_ilm/move/${encodeURIComponent(params.index.toString())}`;
        const meta = {
            name: 'ilm.move_to_step',
            pathParts: {
                index: params.index
            }
        };
        return await this.transport.request({ path, method, querystring, body, meta }, options);
    }
    async putLifecycle(params, options) {
        const acceptedPath = ['name'];
        const acceptedBody = ['policy'];
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
        const path = `/_ilm/policy/${encodeURIComponent(params.name.toString())}`;
        const meta = {
            name: 'ilm.put_lifecycle',
            pathParts: {
                name: params.name
            }
        };
        return await this.transport.request({ path, method, querystring, body, meta }, options);
    }
    async removePolicy(params, options) {
        const acceptedPath = ['index'];
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
        const path = `/${encodeURIComponent(params.index.toString())}/_ilm/remove`;
        const meta = {
            name: 'ilm.remove_policy',
            pathParts: {
                index: params.index
            }
        };
        return await this.transport.request({ path, method, querystring, body, meta }, options);
    }
    async retry(params, options) {
        const acceptedPath = ['index'];
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
        const path = `/${encodeURIComponent(params.index.toString())}/_ilm/retry`;
        const meta = {
            name: 'ilm.retry',
            pathParts: {
                index: params.index
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
        const path = '/_ilm/start';
        const meta = {
            name: 'ilm.start'
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
        const path = '/_ilm/stop';
        const meta = {
            name: 'ilm.stop'
        };
        return await this.transport.request({ path, method, querystring, body, meta }, options);
    }
}
exports.default = Ilm;
//# sourceMappingURL=ilm.js.map