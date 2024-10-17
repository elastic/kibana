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
class Indices {
    constructor(transport) {
        Object.defineProperty(this, "transport", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        this.transport = transport;
    }
    async addBlock(params, options) {
        const acceptedPath = ['index', 'block'];
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
        const path = `/${encodeURIComponent(params.index.toString())}/_block/${encodeURIComponent(params.block.toString())}`;
        const meta = {
            name: 'indices.add_block',
            pathParts: {
                index: params.index,
                block: params.block
            }
        };
        return await this.transport.request({ path, method, querystring, body, meta }, options);
    }
    async analyze(params, options) {
        const acceptedPath = ['index'];
        const acceptedBody = ['analyzer', 'attributes', 'char_filter', 'explain', 'field', 'filter', 'normalizer', 'text', 'tokenizer'];
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
        if (params.index != null) {
            method = body != null ? 'POST' : 'GET';
            path = `/${encodeURIComponent(params.index.toString())}/_analyze`;
        }
        else {
            method = body != null ? 'POST' : 'GET';
            path = '/_analyze';
        }
        const meta = {
            name: 'indices.analyze',
            pathParts: {
                index: params.index
            }
        };
        return await this.transport.request({ path, method, querystring, body, meta }, options);
    }
    async clearCache(params, options) {
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
            method = 'POST';
            path = `/${encodeURIComponent(params.index.toString())}/_cache/clear`;
        }
        else {
            method = 'POST';
            path = '/_cache/clear';
        }
        const meta = {
            name: 'indices.clear_cache',
            pathParts: {
                index: params.index
            }
        };
        return await this.transport.request({ path, method, querystring, body, meta }, options);
    }
    async clone(params, options) {
        const acceptedPath = ['index', 'target'];
        const acceptedBody = ['aliases', 'settings'];
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
        const path = `/${encodeURIComponent(params.index.toString())}/_clone/${encodeURIComponent(params.target.toString())}`;
        const meta = {
            name: 'indices.clone',
            pathParts: {
                index: params.index,
                target: params.target
            }
        };
        return await this.transport.request({ path, method, querystring, body, meta }, options);
    }
    async close(params, options) {
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
        const path = `/${encodeURIComponent(params.index.toString())}/_close`;
        const meta = {
            name: 'indices.close',
            pathParts: {
                index: params.index
            }
        };
        return await this.transport.request({ path, method, querystring, body, meta }, options);
    }
    async create(params, options) {
        const acceptedPath = ['index'];
        const acceptedBody = ['aliases', 'mappings', 'settings'];
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
        const path = `/${encodeURIComponent(params.index.toString())}`;
        const meta = {
            name: 'indices.create',
            pathParts: {
                index: params.index
            }
        };
        return await this.transport.request({ path, method, querystring, body, meta }, options);
    }
    async createDataStream(params, options) {
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
        const method = 'PUT';
        const path = `/_data_stream/${encodeURIComponent(params.name.toString())}`;
        const meta = {
            name: 'indices.create_data_stream',
            pathParts: {
                name: params.name
            }
        };
        return await this.transport.request({ path, method, querystring, body, meta }, options);
    }
    async dataStreamsStats(params, options) {
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
            path = `/_data_stream/${encodeURIComponent(params.name.toString())}/_stats`;
        }
        else {
            method = 'GET';
            path = '/_data_stream/_stats';
        }
        const meta = {
            name: 'indices.data_streams_stats',
            pathParts: {
                name: params.name
            }
        };
        return await this.transport.request({ path, method, querystring, body, meta }, options);
    }
    async delete(params, options) {
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
        const method = 'DELETE';
        const path = `/${encodeURIComponent(params.index.toString())}`;
        const meta = {
            name: 'indices.delete',
            pathParts: {
                index: params.index
            }
        };
        return await this.transport.request({ path, method, querystring, body, meta }, options);
    }
    async deleteAlias(params, options) {
        const acceptedPath = ['index', 'name'];
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
        if (params.index != null && params.name != null) {
            method = 'DELETE';
            path = `/${encodeURIComponent(params.index.toString())}/_alias/${encodeURIComponent(params.name.toString())}`;
        }
        else {
            method = 'DELETE';
            path = `/${encodeURIComponent(params.index.toString())}/_aliases/${encodeURIComponent(params.name.toString())}`;
        }
        const meta = {
            name: 'indices.delete_alias',
            pathParts: {
                index: params.index,
                name: params.name
            }
        };
        return await this.transport.request({ path, method, querystring, body, meta }, options);
    }
    async deleteDataLifecycle(params, options) {
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
        const path = `/_data_stream/${encodeURIComponent(params.name.toString())}/_lifecycle`;
        const meta = {
            name: 'indices.delete_data_lifecycle',
            pathParts: {
                name: params.name
            }
        };
        return await this.transport.request({ path, method, querystring, body, meta }, options);
    }
    async deleteDataStream(params, options) {
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
        const path = `/_data_stream/${encodeURIComponent(params.name.toString())}`;
        const meta = {
            name: 'indices.delete_data_stream',
            pathParts: {
                name: params.name
            }
        };
        return await this.transport.request({ path, method, querystring, body, meta }, options);
    }
    async deleteIndexTemplate(params, options) {
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
        const path = `/_index_template/${encodeURIComponent(params.name.toString())}`;
        const meta = {
            name: 'indices.delete_index_template',
            pathParts: {
                name: params.name
            }
        };
        return await this.transport.request({ path, method, querystring, body, meta }, options);
    }
    async deleteTemplate(params, options) {
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
        const path = `/_template/${encodeURIComponent(params.name.toString())}`;
        const meta = {
            name: 'indices.delete_template',
            pathParts: {
                name: params.name
            }
        };
        return await this.transport.request({ path, method, querystring, body, meta }, options);
    }
    async diskUsage(params, options) {
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
        const path = `/${encodeURIComponent(params.index.toString())}/_disk_usage`;
        const meta = {
            name: 'indices.disk_usage',
            pathParts: {
                index: params.index
            }
        };
        return await this.transport.request({ path, method, querystring, body, meta }, options);
    }
    async downsample(params, options) {
        var _a;
        const acceptedPath = ['index', 'target_index'];
        const acceptedBody = ['config'];
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
        const method = 'POST';
        const path = `/${encodeURIComponent(params.index.toString())}/_downsample/${encodeURIComponent(params.target_index.toString())}`;
        const meta = {
            name: 'indices.downsample',
            pathParts: {
                index: params.index,
                target_index: params.target_index
            }
        };
        return await this.transport.request({ path, method, querystring, body, meta }, options);
    }
    async exists(params, options) {
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
        const method = 'HEAD';
        const path = `/${encodeURIComponent(params.index.toString())}`;
        const meta = {
            name: 'indices.exists',
            pathParts: {
                index: params.index
            }
        };
        return await this.transport.request({ path, method, querystring, body, meta }, options);
    }
    async existsAlias(params, options) {
        const acceptedPath = ['name', 'index'];
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
        if (params.index != null && params.name != null) {
            method = 'HEAD';
            path = `/${encodeURIComponent(params.index.toString())}/_alias/${encodeURIComponent(params.name.toString())}`;
        }
        else {
            method = 'HEAD';
            path = `/_alias/${encodeURIComponent(params.name.toString())}`;
        }
        const meta = {
            name: 'indices.exists_alias',
            pathParts: {
                name: params.name,
                index: params.index
            }
        };
        return await this.transport.request({ path, method, querystring, body, meta }, options);
    }
    async existsIndexTemplate(params, options) {
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
        const path = `/_index_template/${encodeURIComponent(params.name.toString())}`;
        const meta = {
            name: 'indices.exists_index_template',
            pathParts: {
                name: params.name
            }
        };
        return await this.transport.request({ path, method, querystring, body, meta }, options);
    }
    async existsTemplate(params, options) {
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
        const path = `/_template/${encodeURIComponent(params.name.toString())}`;
        const meta = {
            name: 'indices.exists_template',
            pathParts: {
                name: params.name
            }
        };
        return await this.transport.request({ path, method, querystring, body, meta }, options);
    }
    async explainDataLifecycle(params, options) {
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
        const path = `/${encodeURIComponent(params.index.toString())}/_lifecycle/explain`;
        const meta = {
            name: 'indices.explain_data_lifecycle',
            pathParts: {
                index: params.index
            }
        };
        return await this.transport.request({ path, method, querystring, body, meta }, options);
    }
    async fieldUsageStats(params, options) {
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
        const path = `/${encodeURIComponent(params.index.toString())}/_field_usage_stats`;
        const meta = {
            name: 'indices.field_usage_stats',
            pathParts: {
                index: params.index
            }
        };
        return await this.transport.request({ path, method, querystring, body, meta }, options);
    }
    async flush(params, options) {
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
            method = body != null ? 'POST' : 'GET';
            path = `/${encodeURIComponent(params.index.toString())}/_flush`;
        }
        else {
            method = body != null ? 'POST' : 'GET';
            path = '/_flush';
        }
        const meta = {
            name: 'indices.flush',
            pathParts: {
                index: params.index
            }
        };
        return await this.transport.request({ path, method, querystring, body, meta }, options);
    }
    async forcemerge(params, options) {
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
            method = 'POST';
            path = `/${encodeURIComponent(params.index.toString())}/_forcemerge`;
        }
        else {
            method = 'POST';
            path = '/_forcemerge';
        }
        const meta = {
            name: 'indices.forcemerge',
            pathParts: {
                index: params.index
            }
        };
        return await this.transport.request({ path, method, querystring, body, meta }, options);
    }
    async get(params, options) {
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
        const path = `/${encodeURIComponent(params.index.toString())}`;
        const meta = {
            name: 'indices.get',
            pathParts: {
                index: params.index
            }
        };
        return await this.transport.request({ path, method, querystring, body, meta }, options);
    }
    async getAlias(params, options) {
        const acceptedPath = ['name', 'index'];
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
        if (params.index != null && params.name != null) {
            method = 'GET';
            path = `/${encodeURIComponent(params.index.toString())}/_alias/${encodeURIComponent(params.name.toString())}`;
        }
        else if (params.name != null) {
            method = 'GET';
            path = `/_alias/${encodeURIComponent(params.name.toString())}`;
        }
        else if (params.index != null) {
            method = 'GET';
            path = `/${encodeURIComponent(params.index.toString())}/_alias`;
        }
        else {
            method = 'GET';
            path = '/_alias';
        }
        const meta = {
            name: 'indices.get_alias',
            pathParts: {
                name: params.name,
                index: params.index
            }
        };
        return await this.transport.request({ path, method, querystring, body, meta }, options);
    }
    async getDataLifecycle(params, options) {
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
        const method = 'GET';
        const path = `/_data_stream/${encodeURIComponent(params.name.toString())}/_lifecycle`;
        const meta = {
            name: 'indices.get_data_lifecycle',
            pathParts: {
                name: params.name
            }
        };
        return await this.transport.request({ path, method, querystring, body, meta }, options);
    }
    async getDataStream(params, options) {
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
            path = `/_data_stream/${encodeURIComponent(params.name.toString())}`;
        }
        else {
            method = 'GET';
            path = '/_data_stream';
        }
        const meta = {
            name: 'indices.get_data_stream',
            pathParts: {
                name: params.name
            }
        };
        return await this.transport.request({ path, method, querystring, body, meta }, options);
    }
    async getFieldMapping(params, options) {
        const acceptedPath = ['fields', 'index'];
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
        if (params.index != null && params.fields != null) {
            method = 'GET';
            path = `/${encodeURIComponent(params.index.toString())}/_mapping/field/${encodeURIComponent(params.fields.toString())}`;
        }
        else {
            method = 'GET';
            path = `/_mapping/field/${encodeURIComponent(params.fields.toString())}`;
        }
        const meta = {
            name: 'indices.get_field_mapping',
            pathParts: {
                fields: params.fields,
                index: params.index
            }
        };
        return await this.transport.request({ path, method, querystring, body, meta }, options);
    }
    async getIndexTemplate(params, options) {
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
            path = `/_index_template/${encodeURIComponent(params.name.toString())}`;
        }
        else {
            method = 'GET';
            path = '/_index_template';
        }
        const meta = {
            name: 'indices.get_index_template',
            pathParts: {
                name: params.name
            }
        };
        return await this.transport.request({ path, method, querystring, body, meta }, options);
    }
    async getMapping(params, options) {
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
            path = `/${encodeURIComponent(params.index.toString())}/_mapping`;
        }
        else {
            method = 'GET';
            path = '/_mapping';
        }
        const meta = {
            name: 'indices.get_mapping',
            pathParts: {
                index: params.index
            }
        };
        return await this.transport.request({ path, method, querystring, body, meta }, options);
    }
    async getSettings(params, options) {
        const acceptedPath = ['index', 'name'];
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
        if (params.index != null && params.name != null) {
            method = 'GET';
            path = `/${encodeURIComponent(params.index.toString())}/_settings/${encodeURIComponent(params.name.toString())}`;
        }
        else if (params.index != null) {
            method = 'GET';
            path = `/${encodeURIComponent(params.index.toString())}/_settings`;
        }
        else if (params.name != null) {
            method = 'GET';
            path = `/_settings/${encodeURIComponent(params.name.toString())}`;
        }
        else {
            method = 'GET';
            path = '/_settings';
        }
        const meta = {
            name: 'indices.get_settings',
            pathParts: {
                index: params.index,
                name: params.name
            }
        };
        return await this.transport.request({ path, method, querystring, body, meta }, options);
    }
    async getTemplate(params, options) {
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
            path = `/_template/${encodeURIComponent(params.name.toString())}`;
        }
        else {
            method = 'GET';
            path = '/_template';
        }
        const meta = {
            name: 'indices.get_template',
            pathParts: {
                name: params.name
            }
        };
        return await this.transport.request({ path, method, querystring, body, meta }, options);
    }
    async migrateToDataStream(params, options) {
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
        const method = 'POST';
        const path = `/_data_stream/_migrate/${encodeURIComponent(params.name.toString())}`;
        const meta = {
            name: 'indices.migrate_to_data_stream',
            pathParts: {
                name: params.name
            }
        };
        return await this.transport.request({ path, method, querystring, body, meta }, options);
    }
    async modifyDataStream(params, options) {
        const acceptedPath = [];
        const acceptedBody = ['actions'];
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
        const path = '/_data_stream/_modify';
        const meta = {
            name: 'indices.modify_data_stream'
        };
        return await this.transport.request({ path, method, querystring, body, meta }, options);
    }
    async open(params, options) {
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
        const path = `/${encodeURIComponent(params.index.toString())}/_open`;
        const meta = {
            name: 'indices.open',
            pathParts: {
                index: params.index
            }
        };
        return await this.transport.request({ path, method, querystring, body, meta }, options);
    }
    async promoteDataStream(params, options) {
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
        const method = 'POST';
        const path = `/_data_stream/_promote/${encodeURIComponent(params.name.toString())}`;
        const meta = {
            name: 'indices.promote_data_stream',
            pathParts: {
                name: params.name
            }
        };
        return await this.transport.request({ path, method, querystring, body, meta }, options);
    }
    async putAlias(params, options) {
        const acceptedPath = ['index', 'name'];
        const acceptedBody = ['filter', 'index_routing', 'is_write_index', 'routing', 'search_routing'];
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
        if (params.index != null && params.name != null) {
            method = 'PUT';
            path = `/${encodeURIComponent(params.index.toString())}/_alias/${encodeURIComponent(params.name.toString())}`;
        }
        else {
            method = 'PUT';
            path = `/${encodeURIComponent(params.index.toString())}/_aliases/${encodeURIComponent(params.name.toString())}`;
        }
        const meta = {
            name: 'indices.put_alias',
            pathParts: {
                index: params.index,
                name: params.name
            }
        };
        return await this.transport.request({ path, method, querystring, body, meta }, options);
    }
    async putDataLifecycle(params, options) {
        const acceptedPath = ['name'];
        const acceptedBody = ['data_retention', 'downsampling'];
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
        const path = `/_data_stream/${encodeURIComponent(params.name.toString())}/_lifecycle`;
        const meta = {
            name: 'indices.put_data_lifecycle',
            pathParts: {
                name: params.name
            }
        };
        return await this.transport.request({ path, method, querystring, body, meta }, options);
    }
    async putIndexTemplate(params, options) {
        const acceptedPath = ['name'];
        const acceptedBody = ['index_patterns', 'composed_of', 'template', 'data_stream', 'priority', 'version', '_meta', 'allow_auto_create', 'ignore_missing_component_templates', 'deprecated'];
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
        const path = `/_index_template/${encodeURIComponent(params.name.toString())}`;
        const meta = {
            name: 'indices.put_index_template',
            pathParts: {
                name: params.name
            }
        };
        return await this.transport.request({ path, method, querystring, body, meta }, options);
    }
    async putMapping(params, options) {
        const acceptedPath = ['index'];
        const acceptedBody = ['date_detection', 'dynamic', 'dynamic_date_formats', 'dynamic_templates', '_field_names', '_meta', 'numeric_detection', 'properties', '_routing', '_source', 'runtime'];
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
        const path = `/${encodeURIComponent(params.index.toString())}/_mapping`;
        const meta = {
            name: 'indices.put_mapping',
            pathParts: {
                index: params.index
            }
        };
        return await this.transport.request({ path, method, querystring, body, meta }, options);
    }
    async putSettings(params, options) {
        var _a;
        const acceptedPath = ['index'];
        const acceptedBody = ['settings'];
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
        if (params.index != null) {
            method = 'PUT';
            path = `/${encodeURIComponent(params.index.toString())}/_settings`;
        }
        else {
            method = 'PUT';
            path = '/_settings';
        }
        const meta = {
            name: 'indices.put_settings',
            pathParts: {
                index: params.index
            }
        };
        return await this.transport.request({ path, method, querystring, body, meta }, options);
    }
    async putTemplate(params, options) {
        const acceptedPath = ['name'];
        const acceptedBody = ['aliases', 'index_patterns', 'mappings', 'order', 'settings', 'version'];
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
        const path = `/_template/${encodeURIComponent(params.name.toString())}`;
        const meta = {
            name: 'indices.put_template',
            pathParts: {
                name: params.name
            }
        };
        return await this.transport.request({ path, method, querystring, body, meta }, options);
    }
    async recovery(params, options) {
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
            path = `/${encodeURIComponent(params.index.toString())}/_recovery`;
        }
        else {
            method = 'GET';
            path = '/_recovery';
        }
        const meta = {
            name: 'indices.recovery',
            pathParts: {
                index: params.index
            }
        };
        return await this.transport.request({ path, method, querystring, body, meta }, options);
    }
    async refresh(params, options) {
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
            method = body != null ? 'POST' : 'GET';
            path = `/${encodeURIComponent(params.index.toString())}/_refresh`;
        }
        else {
            method = body != null ? 'POST' : 'GET';
            path = '/_refresh';
        }
        const meta = {
            name: 'indices.refresh',
            pathParts: {
                index: params.index
            }
        };
        return await this.transport.request({ path, method, querystring, body, meta }, options);
    }
    async reloadSearchAnalyzers(params, options) {
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
        const method = body != null ? 'POST' : 'GET';
        const path = `/${encodeURIComponent(params.index.toString())}/_reload_search_analyzers`;
        const meta = {
            name: 'indices.reload_search_analyzers',
            pathParts: {
                index: params.index
            }
        };
        return await this.transport.request({ path, method, querystring, body, meta }, options);
    }
    async resolveCluster(params, options) {
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
        const method = 'GET';
        const path = `/_resolve/cluster/${encodeURIComponent(params.name.toString())}`;
        const meta = {
            name: 'indices.resolve_cluster',
            pathParts: {
                name: params.name
            }
        };
        return await this.transport.request({ path, method, querystring, body, meta }, options);
    }
    async resolveIndex(params, options) {
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
        const method = 'GET';
        const path = `/_resolve/index/${encodeURIComponent(params.name.toString())}`;
        const meta = {
            name: 'indices.resolve_index',
            pathParts: {
                name: params.name
            }
        };
        return await this.transport.request({ path, method, querystring, body, meta }, options);
    }
    async rollover(params, options) {
        const acceptedPath = ['alias', 'new_index'];
        const acceptedBody = ['aliases', 'conditions', 'mappings', 'settings'];
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
        if (params.alias != null && params.new_index != null) {
            method = 'POST';
            path = `/${encodeURIComponent(params.alias.toString())}/_rollover/${encodeURIComponent(params.new_index.toString())}`;
        }
        else {
            method = 'POST';
            path = `/${encodeURIComponent(params.alias.toString())}/_rollover`;
        }
        const meta = {
            name: 'indices.rollover',
            pathParts: {
                alias: params.alias,
                new_index: params.new_index
            }
        };
        return await this.transport.request({ path, method, querystring, body, meta }, options);
    }
    async segments(params, options) {
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
            path = `/${encodeURIComponent(params.index.toString())}/_segments`;
        }
        else {
            method = 'GET';
            path = '/_segments';
        }
        const meta = {
            name: 'indices.segments',
            pathParts: {
                index: params.index
            }
        };
        return await this.transport.request({ path, method, querystring, body, meta }, options);
    }
    async shardStores(params, options) {
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
            path = `/${encodeURIComponent(params.index.toString())}/_shard_stores`;
        }
        else {
            method = 'GET';
            path = '/_shard_stores';
        }
        const meta = {
            name: 'indices.shard_stores',
            pathParts: {
                index: params.index
            }
        };
        return await this.transport.request({ path, method, querystring, body, meta }, options);
    }
    async shrink(params, options) {
        const acceptedPath = ['index', 'target'];
        const acceptedBody = ['aliases', 'settings'];
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
        const path = `/${encodeURIComponent(params.index.toString())}/_shrink/${encodeURIComponent(params.target.toString())}`;
        const meta = {
            name: 'indices.shrink',
            pathParts: {
                index: params.index,
                target: params.target
            }
        };
        return await this.transport.request({ path, method, querystring, body, meta }, options);
    }
    async simulateIndexTemplate(params, options) {
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
        const method = 'POST';
        const path = `/_index_template/_simulate_index/${encodeURIComponent(params.name.toString())}`;
        const meta = {
            name: 'indices.simulate_index_template',
            pathParts: {
                name: params.name
            }
        };
        return await this.transport.request({ path, method, querystring, body, meta }, options);
    }
    async simulateTemplate(params, options) {
        const acceptedPath = ['name'];
        const acceptedBody = ['allow_auto_create', 'index_patterns', 'composed_of', 'template', 'data_stream', 'priority', 'version', '_meta', 'ignore_missing_component_templates', 'deprecated'];
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
        if (params.name != null) {
            method = 'POST';
            path = `/_index_template/_simulate/${encodeURIComponent(params.name.toString())}`;
        }
        else {
            method = 'POST';
            path = '/_index_template/_simulate';
        }
        const meta = {
            name: 'indices.simulate_template',
            pathParts: {
                name: params.name
            }
        };
        return await this.transport.request({ path, method, querystring, body, meta }, options);
    }
    async split(params, options) {
        const acceptedPath = ['index', 'target'];
        const acceptedBody = ['aliases', 'settings'];
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
        const path = `/${encodeURIComponent(params.index.toString())}/_split/${encodeURIComponent(params.target.toString())}`;
        const meta = {
            name: 'indices.split',
            pathParts: {
                index: params.index,
                target: params.target
            }
        };
        return await this.transport.request({ path, method, querystring, body, meta }, options);
    }
    async stats(params, options) {
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
        if (params.index != null && params.metric != null) {
            method = 'GET';
            path = `/${encodeURIComponent(params.index.toString())}/_stats/${encodeURIComponent(params.metric.toString())}`;
        }
        else if (params.metric != null) {
            method = 'GET';
            path = `/_stats/${encodeURIComponent(params.metric.toString())}`;
        }
        else if (params.index != null) {
            method = 'GET';
            path = `/${encodeURIComponent(params.index.toString())}/_stats`;
        }
        else {
            method = 'GET';
            path = '/_stats';
        }
        const meta = {
            name: 'indices.stats',
            pathParts: {
                metric: params.metric,
                index: params.index
            }
        };
        return await this.transport.request({ path, method, querystring, body, meta }, options);
    }
    async unfreeze(params, options) {
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
        const path = `/${encodeURIComponent(params.index.toString())}/_unfreeze`;
        const meta = {
            name: 'indices.unfreeze',
            pathParts: {
                index: params.index
            }
        };
        return await this.transport.request({ path, method, querystring, body, meta }, options);
    }
    async updateAliases(params, options) {
        const acceptedPath = [];
        const acceptedBody = ['actions'];
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
        const path = '/_aliases';
        const meta = {
            name: 'indices.update_aliases'
        };
        return await this.transport.request({ path, method, querystring, body, meta }, options);
    }
    async validateQuery(params, options) {
        const acceptedPath = ['index'];
        const acceptedBody = ['query'];
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
        if (params.index != null) {
            method = body != null ? 'POST' : 'GET';
            path = `/${encodeURIComponent(params.index.toString())}/_validate/query`;
        }
        else {
            method = body != null ? 'POST' : 'GET';
            path = '/_validate/query';
        }
        const meta = {
            name: 'indices.validate_query',
            pathParts: {
                index: params.index
            }
        };
        return await this.transport.request({ path, method, querystring, body, meta }, options);
    }
}
exports.default = Indices;
//# sourceMappingURL=indices.js.map