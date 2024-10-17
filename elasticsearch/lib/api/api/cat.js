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
class Cat {
    constructor(transport) {
        Object.defineProperty(this, "transport", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        this.transport = transport;
    }
    async aliases(params, options) {
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
            path = `/_cat/aliases/${encodeURIComponent(params.name.toString())}`;
        }
        else {
            method = 'GET';
            path = '/_cat/aliases';
        }
        const meta = {
            name: 'cat.aliases',
            pathParts: {
                name: params.name
            }
        };
        return await this.transport.request({ path, method, querystring, body, meta }, options);
    }
    async allocation(params, options) {
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
            path = `/_cat/allocation/${encodeURIComponent(params.node_id.toString())}`;
        }
        else {
            method = 'GET';
            path = '/_cat/allocation';
        }
        const meta = {
            name: 'cat.allocation',
            pathParts: {
                node_id: params.node_id
            }
        };
        return await this.transport.request({ path, method, querystring, body, meta }, options);
    }
    async componentTemplates(params, options) {
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
            path = `/_cat/component_templates/${encodeURIComponent(params.name.toString())}`;
        }
        else {
            method = 'GET';
            path = '/_cat/component_templates';
        }
        const meta = {
            name: 'cat.component_templates',
            pathParts: {
                name: params.name
            }
        };
        return await this.transport.request({ path, method, querystring, body, meta }, options);
    }
    async count(params, options) {
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
            path = `/_cat/count/${encodeURIComponent(params.index.toString())}`;
        }
        else {
            method = 'GET';
            path = '/_cat/count';
        }
        const meta = {
            name: 'cat.count',
            pathParts: {
                index: params.index
            }
        };
        return await this.transport.request({ path, method, querystring, body, meta }, options);
    }
    async fielddata(params, options) {
        const acceptedPath = ['fields'];
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
        if (params.fields != null) {
            method = 'GET';
            path = `/_cat/fielddata/${encodeURIComponent(params.fields.toString())}`;
        }
        else {
            method = 'GET';
            path = '/_cat/fielddata';
        }
        const meta = {
            name: 'cat.fielddata',
            pathParts: {
                fields: params.fields
            }
        };
        return await this.transport.request({ path, method, querystring, body, meta }, options);
    }
    async health(params, options) {
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
        const path = '/_cat/health';
        const meta = {
            name: 'cat.health'
        };
        return await this.transport.request({ path, method, querystring, body, meta }, options);
    }
    async help(params, options) {
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
        const path = '/_cat';
        const meta = {
            name: 'cat.help'
        };
        return await this.transport.request({ path, method, querystring, body, meta }, options);
    }
    async indices(params, options) {
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
            path = `/_cat/indices/${encodeURIComponent(params.index.toString())}`;
        }
        else {
            method = 'GET';
            path = '/_cat/indices';
        }
        const meta = {
            name: 'cat.indices',
            pathParts: {
                index: params.index
            }
        };
        return await this.transport.request({ path, method, querystring, body, meta }, options);
    }
    async master(params, options) {
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
        const path = '/_cat/master';
        const meta = {
            name: 'cat.master'
        };
        return await this.transport.request({ path, method, querystring, body, meta }, options);
    }
    async mlDataFrameAnalytics(params, options) {
        const acceptedPath = ['id'];
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
        if (params.id != null) {
            method = 'GET';
            path = `/_cat/ml/data_frame/analytics/${encodeURIComponent(params.id.toString())}`;
        }
        else {
            method = 'GET';
            path = '/_cat/ml/data_frame/analytics';
        }
        const meta = {
            name: 'cat.ml_data_frame_analytics',
            pathParts: {
                id: params.id
            }
        };
        return await this.transport.request({ path, method, querystring, body, meta }, options);
    }
    async mlDatafeeds(params, options) {
        const acceptedPath = ['datafeed_id'];
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
        if (params.datafeed_id != null) {
            method = 'GET';
            path = `/_cat/ml/datafeeds/${encodeURIComponent(params.datafeed_id.toString())}`;
        }
        else {
            method = 'GET';
            path = '/_cat/ml/datafeeds';
        }
        const meta = {
            name: 'cat.ml_datafeeds',
            pathParts: {
                datafeed_id: params.datafeed_id
            }
        };
        return await this.transport.request({ path, method, querystring, body, meta }, options);
    }
    async mlJobs(params, options) {
        const acceptedPath = ['job_id'];
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
        if (params.job_id != null) {
            method = 'GET';
            path = `/_cat/ml/anomaly_detectors/${encodeURIComponent(params.job_id.toString())}`;
        }
        else {
            method = 'GET';
            path = '/_cat/ml/anomaly_detectors';
        }
        const meta = {
            name: 'cat.ml_jobs',
            pathParts: {
                job_id: params.job_id
            }
        };
        return await this.transport.request({ path, method, querystring, body, meta }, options);
    }
    async mlTrainedModels(params, options) {
        const acceptedPath = ['model_id'];
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
        if (params.model_id != null) {
            method = 'GET';
            path = `/_cat/ml/trained_models/${encodeURIComponent(params.model_id.toString())}`;
        }
        else {
            method = 'GET';
            path = '/_cat/ml/trained_models';
        }
        const meta = {
            name: 'cat.ml_trained_models',
            pathParts: {
                model_id: params.model_id
            }
        };
        return await this.transport.request({ path, method, querystring, body, meta }, options);
    }
    async nodeattrs(params, options) {
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
        const path = '/_cat/nodeattrs';
        const meta = {
            name: 'cat.nodeattrs'
        };
        return await this.transport.request({ path, method, querystring, body, meta }, options);
    }
    async nodes(params, options) {
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
        const path = '/_cat/nodes';
        const meta = {
            name: 'cat.nodes'
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
        const path = '/_cat/pending_tasks';
        const meta = {
            name: 'cat.pending_tasks'
        };
        return await this.transport.request({ path, method, querystring, body, meta }, options);
    }
    async plugins(params, options) {
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
        const path = '/_cat/plugins';
        const meta = {
            name: 'cat.plugins'
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
            path = `/_cat/recovery/${encodeURIComponent(params.index.toString())}`;
        }
        else {
            method = 'GET';
            path = '/_cat/recovery';
        }
        const meta = {
            name: 'cat.recovery',
            pathParts: {
                index: params.index
            }
        };
        return await this.transport.request({ path, method, querystring, body, meta }, options);
    }
    async repositories(params, options) {
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
        const path = '/_cat/repositories';
        const meta = {
            name: 'cat.repositories'
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
            path = `/_cat/segments/${encodeURIComponent(params.index.toString())}`;
        }
        else {
            method = 'GET';
            path = '/_cat/segments';
        }
        const meta = {
            name: 'cat.segments',
            pathParts: {
                index: params.index
            }
        };
        return await this.transport.request({ path, method, querystring, body, meta }, options);
    }
    async shards(params, options) {
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
            path = `/_cat/shards/${encodeURIComponent(params.index.toString())}`;
        }
        else {
            method = 'GET';
            path = '/_cat/shards';
        }
        const meta = {
            name: 'cat.shards',
            pathParts: {
                index: params.index
            }
        };
        return await this.transport.request({ path, method, querystring, body, meta }, options);
    }
    async snapshots(params, options) {
        const acceptedPath = ['repository'];
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
        if (params.repository != null) {
            method = 'GET';
            path = `/_cat/snapshots/${encodeURIComponent(params.repository.toString())}`;
        }
        else {
            method = 'GET';
            path = '/_cat/snapshots';
        }
        const meta = {
            name: 'cat.snapshots',
            pathParts: {
                repository: params.repository
            }
        };
        return await this.transport.request({ path, method, querystring, body, meta }, options);
    }
    async tasks(params, options) {
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
        const path = '/_cat/tasks';
        const meta = {
            name: 'cat.tasks'
        };
        return await this.transport.request({ path, method, querystring, body, meta }, options);
    }
    async templates(params, options) {
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
            path = `/_cat/templates/${encodeURIComponent(params.name.toString())}`;
        }
        else {
            method = 'GET';
            path = '/_cat/templates';
        }
        const meta = {
            name: 'cat.templates',
            pathParts: {
                name: params.name
            }
        };
        return await this.transport.request({ path, method, querystring, body, meta }, options);
    }
    async threadPool(params, options) {
        const acceptedPath = ['thread_pool_patterns'];
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
        if (params.thread_pool_patterns != null) {
            method = 'GET';
            path = `/_cat/thread_pool/${encodeURIComponent(params.thread_pool_patterns.toString())}`;
        }
        else {
            method = 'GET';
            path = '/_cat/thread_pool';
        }
        const meta = {
            name: 'cat.thread_pool',
            pathParts: {
                thread_pool_patterns: params.thread_pool_patterns
            }
        };
        return await this.transport.request({ path, method, querystring, body, meta }, options);
    }
    async transforms(params, options) {
        const acceptedPath = ['transform_id'];
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
        if (params.transform_id != null) {
            method = 'GET';
            path = `/_cat/transforms/${encodeURIComponent(params.transform_id.toString())}`;
        }
        else {
            method = 'GET';
            path = '/_cat/transforms';
        }
        const meta = {
            name: 'cat.transforms',
            pathParts: {
                transform_id: params.transform_id
            }
        };
        return await this.transport.request({ path, method, querystring, body, meta }, options);
    }
}
exports.default = Cat;
//# sourceMappingURL=cat.js.map