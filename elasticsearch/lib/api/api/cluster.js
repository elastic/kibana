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
class Cluster {
    constructor(transport) {
        Object.defineProperty(this, "transport", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        this.transport = transport;
    }
    async allocationExplain(params, options) {
        const acceptedPath = [];
        const acceptedBody = ['current_node', 'index', 'primary', 'shard'];
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
        const method = body != null ? 'POST' : 'GET';
        const path = '/_cluster/allocation/explain';
        const meta = {
            name: 'cluster.allocation_explain'
        };
        return await this.transport.request({ path, method, querystring, body, meta }, options);
    }
    async deleteComponentTemplate(params, options) {
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
        const path = `/_component_template/${encodeURIComponent(params.name.toString())}`;
        const meta = {
            name: 'cluster.delete_component_template',
            pathParts: {
                name: params.name
            }
        };
        return await this.transport.request({ path, method, querystring, body, meta }, options);
    }
    async deleteVotingConfigExclusions(params, options) {
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
        const method = 'DELETE';
        const path = '/_cluster/voting_config_exclusions';
        const meta = {
            name: 'cluster.delete_voting_config_exclusions'
        };
        return await this.transport.request({ path, method, querystring, body, meta }, options);
    }
    async existsComponentTemplate(params, options) {
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
        const method = 'HEAD';
        const path = `/_component_template/${encodeURIComponent(params.name.toString())}`;
        const meta = {
            name: 'cluster.exists_component_template',
            pathParts: {
                name: params.name
            }
        };
        return await this.transport.request({ path, method, querystring, body, meta }, options);
    }
    async getComponentTemplate(params, options) {
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
            path = `/_component_template/${encodeURIComponent(params.name.toString())}`;
        }
        else {
            method = 'GET';
            path = '/_component_template';
        }
        const meta = {
            name: 'cluster.get_component_template',
            pathParts: {
                name: params.name
            }
        };
        return await this.transport.request({ path, method, querystring, body, meta }, options);
    }
    async getSettings(params, options) {
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
        const path = '/_cluster/settings';
        const meta = {
            name: 'cluster.get_settings'
        };
        return await this.transport.request({ path, method, querystring, body, meta }, options);
    }
    async health(params, options) {
        const acceptedPath = ['index'];
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
        if (params.index != null) {
            method = 'GET';
            path = `/_cluster/health/${encodeURIComponent(params.index.toString())}`;
        }
        else {
            method = 'GET';
            path = '/_cluster/health';
        }
        const meta = {
            name: 'cluster.health',
            pathParts: {
                index: params.index
            }
        };
        return await this.transport.request({ path, method, querystring, body, meta }, options);
    }
    async info(params, options) {
        const acceptedPath = ['target'];
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
        const path = `/_info/${encodeURIComponent(params.target.toString())}`;
        const meta = {
            name: 'cluster.info',
            pathParts: {
                target: params.target
            }
        };
        return await this.transport.request({ path, method, querystring, body, meta }, options);
    }
    async pendingTasks(params, options) {
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
        const path = '/_cluster/pending_tasks';
        const meta = {
            name: 'cluster.pending_tasks'
        };
        return await this.transport.request({ path, method, querystring, body, meta }, options);
    }
    async postVotingConfigExclusions(params, options) {
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
        const path = '/_cluster/voting_config_exclusions';
        const meta = {
            name: 'cluster.post_voting_config_exclusions'
        };
        return await this.transport.request({ path, method, querystring, body, meta }, options);
    }
    async putComponentTemplate(params, options) {
        const acceptedPath = ['name'];
        const acceptedBody = ['template', 'version', '_meta', 'deprecated'];
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
        const path = `/_component_template/${encodeURIComponent(params.name.toString())}`;
        const meta = {
            name: 'cluster.put_component_template',
            pathParts: {
                name: params.name
            }
        };
        return await this.transport.request({ path, method, querystring, body, meta }, options);
    }
    async putSettings(params, options) {
        const acceptedPath = [];
        const acceptedBody = ['persistent', 'transient'];
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
        const method = 'PUT';
        const path = '/_cluster/settings';
        const meta = {
            name: 'cluster.put_settings'
        };
        return await this.transport.request({ path, method, querystring, body, meta }, options);
    }
    async remoteInfo(params, options) {
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
        const path = '/_remote/info';
        const meta = {
            name: 'cluster.remote_info'
        };
        return await this.transport.request({ path, method, querystring, body, meta }, options);
    }
    async reroute(params, options) {
        const acceptedPath = [];
        const acceptedBody = ['commands'];
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
        const path = '/_cluster/reroute';
        const meta = {
            name: 'cluster.reroute'
        };
        return await this.transport.request({ path, method, querystring, body, meta }, options);
    }
    async state(params, options) {
        const acceptedPath = ['metric', 'index'];
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
        if (params.metric != null && params.index != null) {
            method = 'GET';
            path = `/_cluster/state/${encodeURIComponent(params.metric.toString())}/${encodeURIComponent(params.index.toString())}`;
        }
        else if (params.metric != null) {
            method = 'GET';
            path = `/_cluster/state/${encodeURIComponent(params.metric.toString())}`;
        }
        else {
            method = 'GET';
            path = '/_cluster/state';
        }
        const meta = {
            name: 'cluster.state',
            pathParts: {
                metric: params.metric,
                index: params.index
            }
        };
        return await this.transport.request({ path, method, querystring, body, meta }, options);
    }
    async stats(params, options) {
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
            path = `/_cluster/stats/nodes/${encodeURIComponent(params.node_id.toString())}`;
        }
        else {
            method = 'GET';
            path = '/_cluster/stats';
        }
        const meta = {
            name: 'cluster.stats',
            pathParts: {
                node_id: params.node_id
            }
        };
        return await this.transport.request({ path, method, querystring, body, meta }, options);
    }
}
exports.default = Cluster;
//# sourceMappingURL=cluster.js.map