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
class Nodes {
    constructor(transport) {
        Object.defineProperty(this, "transport", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        this.transport = transport;
    }
    async clearRepositoriesMeteringArchive(params, options) {
        const acceptedPath = ['node_id', 'max_archive_version'];
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
        const path = `/_nodes/${encodeURIComponent(params.node_id.toString())}/_repositories_metering/${encodeURIComponent(params.max_archive_version.toString())}`;
        const meta = {
            name: 'nodes.clear_repositories_metering_archive',
            pathParts: {
                node_id: params.node_id,
                max_archive_version: params.max_archive_version
            }
        };
        return await this.transport.request({ path, method, querystring, body, meta }, options);
    }
    async getRepositoriesMeteringInfo(params, options) {
        const acceptedPath = ['node_id'];
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
        const path = `/_nodes/${encodeURIComponent(params.node_id.toString())}/_repositories_metering`;
        const meta = {
            name: 'nodes.get_repositories_metering_info',
            pathParts: {
                node_id: params.node_id
            }
        };
        return await this.transport.request({ path, method, querystring, body, meta }, options);
    }
    async hotThreads(params, options) {
        const acceptedPath = ['node_id'];
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
        if (params.node_id != null) {
            method = 'GET';
            path = `/_nodes/${encodeURIComponent(params.node_id.toString())}/hot_threads`;
        }
        else {
            method = 'GET';
            path = '/_nodes/hot_threads';
        }
        const meta = {
            name: 'nodes.hot_threads',
            pathParts: {
                node_id: params.node_id
            }
        };
        return await this.transport.request({ path, method, querystring, body, meta }, options);
    }
    async info(params, options) {
        const acceptedPath = ['node_id', 'metric'];
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
        if (params.node_id != null && params.metric != null) {
            method = 'GET';
            path = `/_nodes/${encodeURIComponent(params.node_id.toString())}/${encodeURIComponent(params.metric.toString())}`;
        }
        else if (params.node_id != null) {
            method = 'GET';
            path = `/_nodes/${encodeURIComponent(params.node_id.toString())}`;
        }
        else if (params.metric != null) {
            method = 'GET';
            path = `/_nodes/${encodeURIComponent(params.metric.toString())}`;
        }
        else {
            method = 'GET';
            path = '/_nodes';
        }
        const meta = {
            name: 'nodes.info',
            pathParts: {
                node_id: params.node_id,
                metric: params.metric
            }
        };
        return await this.transport.request({ path, method, querystring, body, meta }, options);
    }
    async reloadSecureSettings(params, options) {
        const acceptedPath = ['node_id'];
        const acceptedBody = ['secure_settings_password'];
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
        let method = '';
        let path = '';
        if (params.node_id != null) {
            method = 'POST';
            path = `/_nodes/${encodeURIComponent(params.node_id.toString())}/reload_secure_settings`;
        }
        else {
            method = 'POST';
            path = '/_nodes/reload_secure_settings';
        }
        const meta = {
            name: 'nodes.reload_secure_settings',
            pathParts: {
                node_id: params.node_id
            }
        };
        return await this.transport.request({ path, method, querystring, body, meta }, options);
    }
    async stats(params, options) {
        const acceptedPath = ['node_id', 'metric', 'index_metric'];
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
        if (params.node_id != null && params.metric != null && params.index_metric != null) {
            method = 'GET';
            path = `/_nodes/${encodeURIComponent(params.node_id.toString())}/stats/${encodeURIComponent(params.metric.toString())}/${encodeURIComponent(params.index_metric.toString())}`;
        }
        else if (params.node_id != null && params.metric != null) {
            method = 'GET';
            path = `/_nodes/${encodeURIComponent(params.node_id.toString())}/stats/${encodeURIComponent(params.metric.toString())}`;
        }
        else if (params.metric != null && params.index_metric != null) {
            method = 'GET';
            path = `/_nodes/stats/${encodeURIComponent(params.metric.toString())}/${encodeURIComponent(params.index_metric.toString())}`;
        }
        else if (params.node_id != null) {
            method = 'GET';
            path = `/_nodes/${encodeURIComponent(params.node_id.toString())}/stats`;
        }
        else if (params.metric != null) {
            method = 'GET';
            path = `/_nodes/stats/${encodeURIComponent(params.metric.toString())}`;
        }
        else {
            method = 'GET';
            path = '/_nodes/stats';
        }
        const meta = {
            name: 'nodes.stats',
            pathParts: {
                node_id: params.node_id,
                metric: params.metric,
                index_metric: params.index_metric
            }
        };
        return await this.transport.request({ path, method, querystring, body, meta }, options);
    }
    async usage(params, options) {
        const acceptedPath = ['node_id', 'metric'];
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
        if (params.node_id != null && params.metric != null) {
            method = 'GET';
            path = `/_nodes/${encodeURIComponent(params.node_id.toString())}/usage/${encodeURIComponent(params.metric.toString())}`;
        }
        else if (params.node_id != null) {
            method = 'GET';
            path = `/_nodes/${encodeURIComponent(params.node_id.toString())}/usage`;
        }
        else if (params.metric != null) {
            method = 'GET';
            path = `/_nodes/usage/${encodeURIComponent(params.metric.toString())}`;
        }
        else {
            method = 'GET';
            path = '/_nodes/usage';
        }
        const meta = {
            name: 'nodes.usage',
            pathParts: {
                node_id: params.node_id,
                metric: params.metric
            }
        };
        return await this.transport.request({ path, method, querystring, body, meta }, options);
    }
}
exports.default = Nodes;
//# sourceMappingURL=nodes.js.map