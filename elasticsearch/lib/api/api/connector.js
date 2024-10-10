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
class Connector {
    constructor(transport) {
        Object.defineProperty(this, "transport", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        this.transport = transport;
    }
    async checkIn(params, options) {
        const acceptedPath = ['connector_id'];
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
        const path = `/_connector/${encodeURIComponent(params.connector_id.toString())}/_check_in`;
        const meta = {
            name: 'connector.check_in',
            pathParts: {
                connector_id: params.connector_id
            }
        };
        return await this.transport.request({ path, method, querystring, body, meta }, options);
    }
    async delete(params, options) {
        const acceptedPath = ['connector_id'];
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
        const path = `/_connector/${encodeURIComponent(params.connector_id.toString())}`;
        const meta = {
            name: 'connector.delete',
            pathParts: {
                connector_id: params.connector_id
            }
        };
        return await this.transport.request({ path, method, querystring, body, meta }, options);
    }
    async get(params, options) {
        const acceptedPath = ['connector_id'];
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
        const path = `/_connector/${encodeURIComponent(params.connector_id.toString())}`;
        const meta = {
            name: 'connector.get',
            pathParts: {
                connector_id: params.connector_id
            }
        };
        return await this.transport.request({ path, method, querystring, body, meta }, options);
    }
    async lastSync(params, options) {
        const acceptedPath = ['connector_id'];
        const acceptedBody = ['last_access_control_sync_error', 'last_access_control_sync_scheduled_at', 'last_access_control_sync_status', 'last_deleted_document_count', 'last_incremental_sync_scheduled_at', 'last_indexed_document_count', 'last_seen', 'last_sync_error', 'last_sync_scheduled_at', 'last_sync_status', 'last_synced', 'sync_cursor'];
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
        const path = `/_connector/${encodeURIComponent(params.connector_id.toString())}/_last_sync`;
        const meta = {
            name: 'connector.last_sync',
            pathParts: {
                connector_id: params.connector_id
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
        const path = '/_connector';
        const meta = {
            name: 'connector.list'
        };
        return await this.transport.request({ path, method, querystring, body, meta }, options);
    }
    async post(params, options) {
        const acceptedPath = [];
        const acceptedBody = ['description', 'index_name', 'is_native', 'language', 'name', 'service_type'];
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
        const path = '/_connector';
        const meta = {
            name: 'connector.post'
        };
        return await this.transport.request({ path, method, querystring, body, meta }, options);
    }
    async put(params, options) {
        const acceptedPath = ['connector_id'];
        const acceptedBody = ['description', 'index_name', 'is_native', 'language', 'name', 'service_type'];
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
        if (params.connector_id != null) {
            method = 'PUT';
            path = `/_connector/${encodeURIComponent(params.connector_id.toString())}`;
        }
        else {
            method = 'PUT';
            path = '/_connector';
        }
        const meta = {
            name: 'connector.put',
            pathParts: {
                connector_id: params.connector_id
            }
        };
        return await this.transport.request({ path, method, querystring, body, meta }, options);
    }
    async secretDelete(params, options) {
        const acceptedPath = ['id'];
        const querystring = {};
        const body = undefined;
        params = params !== null && params !== void 0 ? params : {};
        for (const key in params) {
            if (acceptedPath.includes(key)) {
                continue;
            }
            else if (key !== 'body') {
                querystring[key] = params[key];
            }
        }
        const method = 'DELETE';
        const path = `/_connector/_secret/${encodeURIComponent(params.id.toString())}`;
        const meta = {
            name: 'connector.secret_delete',
            pathParts: {
                id: params.id
            }
        };
        return await this.transport.request({ path, method, querystring, body, meta }, options);
    }
    async secretGet(params, options) {
        const acceptedPath = ['id'];
        const querystring = {};
        const body = undefined;
        params = params !== null && params !== void 0 ? params : {};
        for (const key in params) {
            if (acceptedPath.includes(key)) {
                continue;
            }
            else if (key !== 'body') {
                querystring[key] = params[key];
            }
        }
        const method = 'GET';
        const path = `/_connector/_secret/${encodeURIComponent(params.id.toString())}`;
        const meta = {
            name: 'connector.secret_get',
            pathParts: {
                id: params.id
            }
        };
        return await this.transport.request({ path, method, querystring, body, meta }, options);
    }
    async secretPost(params, options) {
        const acceptedPath = [];
        const querystring = {};
        const body = undefined;
        params = params !== null && params !== void 0 ? params : {};
        for (const key in params) {
            if (acceptedPath.includes(key)) {
                continue;
            }
            else if (key !== 'body') {
                querystring[key] = params[key];
            }
        }
        const method = 'POST';
        const path = '/_connector/_secret';
        const meta = {
            name: 'connector.secret_post'
        };
        return await this.transport.request({ path, method, querystring, body, meta }, options);
    }
    async secretPut(params, options) {
        const acceptedPath = ['id'];
        const querystring = {};
        const body = undefined;
        params = params !== null && params !== void 0 ? params : {};
        for (const key in params) {
            if (acceptedPath.includes(key)) {
                continue;
            }
            else if (key !== 'body') {
                querystring[key] = params[key];
            }
        }
        const method = 'PUT';
        const path = `/_connector/_secret/${encodeURIComponent(params.id.toString())}`;
        const meta = {
            name: 'connector.secret_put',
            pathParts: {
                id: params.id
            }
        };
        return await this.transport.request({ path, method, querystring, body, meta }, options);
    }
    async syncJobCancel(params, options) {
        const acceptedPath = ['connector_sync_job_id'];
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
        const path = `/_connector/_sync_job/${encodeURIComponent(params.connector_sync_job_id.toString())}/_cancel`;
        const meta = {
            name: 'connector.sync_job_cancel',
            pathParts: {
                connector_sync_job_id: params.connector_sync_job_id
            }
        };
        return await this.transport.request({ path, method, querystring, body, meta }, options);
    }
    async syncJobCheckIn(params, options) {
        const acceptedPath = ['connector_sync_job_id'];
        const querystring = {};
        const body = undefined;
        params = params !== null && params !== void 0 ? params : {};
        for (const key in params) {
            if (acceptedPath.includes(key)) {
                continue;
            }
            else if (key !== 'body') {
                querystring[key] = params[key];
            }
        }
        const method = 'PUT';
        const path = `/_connector/_sync_job/${encodeURIComponent(params.connector_sync_job_id.toString())}/_check_in`;
        const meta = {
            name: 'connector.sync_job_check_in',
            pathParts: {
                connector_sync_job_id: params.connector_sync_job_id
            }
        };
        return await this.transport.request({ path, method, querystring, body, meta }, options);
    }
    async syncJobClaim(params, options) {
        const acceptedPath = ['connector_sync_job_id'];
        const querystring = {};
        const body = undefined;
        params = params !== null && params !== void 0 ? params : {};
        for (const key in params) {
            if (acceptedPath.includes(key)) {
                continue;
            }
            else if (key !== 'body') {
                querystring[key] = params[key];
            }
        }
        const method = 'PUT';
        const path = `/_connector/_sync_job/${encodeURIComponent(params.connector_sync_job_id.toString())}/_claim`;
        const meta = {
            name: 'connector.sync_job_claim',
            pathParts: {
                connector_sync_job_id: params.connector_sync_job_id
            }
        };
        return await this.transport.request({ path, method, querystring, body, meta }, options);
    }
    async syncJobDelete(params, options) {
        const acceptedPath = ['connector_sync_job_id'];
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
        const path = `/_connector/_sync_job/${encodeURIComponent(params.connector_sync_job_id.toString())}`;
        const meta = {
            name: 'connector.sync_job_delete',
            pathParts: {
                connector_sync_job_id: params.connector_sync_job_id
            }
        };
        return await this.transport.request({ path, method, querystring, body, meta }, options);
    }
    async syncJobError(params, options) {
        const acceptedPath = ['connector_sync_job_id'];
        const querystring = {};
        const body = undefined;
        params = params !== null && params !== void 0 ? params : {};
        for (const key in params) {
            if (acceptedPath.includes(key)) {
                continue;
            }
            else if (key !== 'body') {
                querystring[key] = params[key];
            }
        }
        const method = 'PUT';
        const path = `/_connector/_sync_job/${encodeURIComponent(params.connector_sync_job_id.toString())}/_error`;
        const meta = {
            name: 'connector.sync_job_error',
            pathParts: {
                connector_sync_job_id: params.connector_sync_job_id
            }
        };
        return await this.transport.request({ path, method, querystring, body, meta }, options);
    }
    async syncJobGet(params, options) {
        const acceptedPath = ['connector_sync_job_id'];
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
        const path = `/_connector/_sync_job/${encodeURIComponent(params.connector_sync_job_id.toString())}`;
        const meta = {
            name: 'connector.sync_job_get',
            pathParts: {
                connector_sync_job_id: params.connector_sync_job_id
            }
        };
        return await this.transport.request({ path, method, querystring, body, meta }, options);
    }
    async syncJobList(params, options) {
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
        const path = '/_connector/_sync_job';
        const meta = {
            name: 'connector.sync_job_list'
        };
        return await this.transport.request({ path, method, querystring, body, meta }, options);
    }
    async syncJobPost(params, options) {
        const acceptedPath = [];
        const acceptedBody = ['id', 'job_type', 'trigger_method'];
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
        const path = '/_connector/_sync_job';
        const meta = {
            name: 'connector.sync_job_post'
        };
        return await this.transport.request({ path, method, querystring, body, meta }, options);
    }
    async syncJobUpdateStats(params, options) {
        const acceptedPath = ['connector_sync_job_id'];
        const querystring = {};
        const body = undefined;
        params = params !== null && params !== void 0 ? params : {};
        for (const key in params) {
            if (acceptedPath.includes(key)) {
                continue;
            }
            else if (key !== 'body') {
                querystring[key] = params[key];
            }
        }
        const method = 'PUT';
        const path = `/_connector/_sync_job/${encodeURIComponent(params.connector_sync_job_id.toString())}/_stats`;
        const meta = {
            name: 'connector.sync_job_update_stats',
            pathParts: {
                connector_sync_job_id: params.connector_sync_job_id
            }
        };
        return await this.transport.request({ path, method, querystring, body, meta }, options);
    }
    async updateActiveFiltering(params, options) {
        const acceptedPath = ['connector_id'];
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
        const path = `/_connector/${encodeURIComponent(params.connector_id.toString())}/_filtering/_activate`;
        const meta = {
            name: 'connector.update_active_filtering',
            pathParts: {
                connector_id: params.connector_id
            }
        };
        return await this.transport.request({ path, method, querystring, body, meta }, options);
    }
    async updateApiKeyId(params, options) {
        const acceptedPath = ['connector_id'];
        const acceptedBody = ['api_key_id', 'api_key_secret_id'];
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
        const path = `/_connector/${encodeURIComponent(params.connector_id.toString())}/_api_key_id`;
        const meta = {
            name: 'connector.update_api_key_id',
            pathParts: {
                connector_id: params.connector_id
            }
        };
        return await this.transport.request({ path, method, querystring, body, meta }, options);
    }
    async updateConfiguration(params, options) {
        const acceptedPath = ['connector_id'];
        const acceptedBody = ['configuration', 'values'];
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
        const path = `/_connector/${encodeURIComponent(params.connector_id.toString())}/_configuration`;
        const meta = {
            name: 'connector.update_configuration',
            pathParts: {
                connector_id: params.connector_id
            }
        };
        return await this.transport.request({ path, method, querystring, body, meta }, options);
    }
    async updateError(params, options) {
        const acceptedPath = ['connector_id'];
        const acceptedBody = ['error'];
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
        const path = `/_connector/${encodeURIComponent(params.connector_id.toString())}/_error`;
        const meta = {
            name: 'connector.update_error',
            pathParts: {
                connector_id: params.connector_id
            }
        };
        return await this.transport.request({ path, method, querystring, body, meta }, options);
    }
    async updateFeatures(params, options) {
        const acceptedPath = ['connector_id'];
        const querystring = {};
        const body = undefined;
        params = params !== null && params !== void 0 ? params : {};
        for (const key in params) {
            if (acceptedPath.includes(key)) {
                continue;
            }
            else if (key !== 'body') {
                querystring[key] = params[key];
            }
        }
        const method = 'PUT';
        const path = `/_connector/${encodeURIComponent(params.connector_id.toString())}/_features`;
        const meta = {
            name: 'connector.update_features',
            pathParts: {
                connector_id: params.connector_id
            }
        };
        return await this.transport.request({ path, method, querystring, body, meta }, options);
    }
    async updateFiltering(params, options) {
        const acceptedPath = ['connector_id'];
        const acceptedBody = ['filtering', 'rules', 'advanced_snippet'];
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
        const path = `/_connector/${encodeURIComponent(params.connector_id.toString())}/_filtering`;
        const meta = {
            name: 'connector.update_filtering',
            pathParts: {
                connector_id: params.connector_id
            }
        };
        return await this.transport.request({ path, method, querystring, body, meta }, options);
    }
    async updateFilteringValidation(params, options) {
        const acceptedPath = ['connector_id'];
        const acceptedBody = ['validation'];
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
        const path = `/_connector/${encodeURIComponent(params.connector_id.toString())}/_filtering/_validation`;
        const meta = {
            name: 'connector.update_filtering_validation',
            pathParts: {
                connector_id: params.connector_id
            }
        };
        return await this.transport.request({ path, method, querystring, body, meta }, options);
    }
    async updateIndexName(params, options) {
        const acceptedPath = ['connector_id'];
        const acceptedBody = ['index_name'];
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
        const path = `/_connector/${encodeURIComponent(params.connector_id.toString())}/_index_name`;
        const meta = {
            name: 'connector.update_index_name',
            pathParts: {
                connector_id: params.connector_id
            }
        };
        return await this.transport.request({ path, method, querystring, body, meta }, options);
    }
    async updateName(params, options) {
        const acceptedPath = ['connector_id'];
        const acceptedBody = ['name', 'description'];
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
        const path = `/_connector/${encodeURIComponent(params.connector_id.toString())}/_name`;
        const meta = {
            name: 'connector.update_name',
            pathParts: {
                connector_id: params.connector_id
            }
        };
        return await this.transport.request({ path, method, querystring, body, meta }, options);
    }
    async updateNative(params, options) {
        const acceptedPath = ['connector_id'];
        const acceptedBody = ['is_native'];
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
        const path = `/_connector/${encodeURIComponent(params.connector_id.toString())}/_native`;
        const meta = {
            name: 'connector.update_native',
            pathParts: {
                connector_id: params.connector_id
            }
        };
        return await this.transport.request({ path, method, querystring, body, meta }, options);
    }
    async updatePipeline(params, options) {
        const acceptedPath = ['connector_id'];
        const acceptedBody = ['pipeline'];
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
        const path = `/_connector/${encodeURIComponent(params.connector_id.toString())}/_pipeline`;
        const meta = {
            name: 'connector.update_pipeline',
            pathParts: {
                connector_id: params.connector_id
            }
        };
        return await this.transport.request({ path, method, querystring, body, meta }, options);
    }
    async updateScheduling(params, options) {
        const acceptedPath = ['connector_id'];
        const acceptedBody = ['scheduling'];
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
        const path = `/_connector/${encodeURIComponent(params.connector_id.toString())}/_scheduling`;
        const meta = {
            name: 'connector.update_scheduling',
            pathParts: {
                connector_id: params.connector_id
            }
        };
        return await this.transport.request({ path, method, querystring, body, meta }, options);
    }
    async updateServiceType(params, options) {
        const acceptedPath = ['connector_id'];
        const acceptedBody = ['service_type'];
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
        const path = `/_connector/${encodeURIComponent(params.connector_id.toString())}/_service_type`;
        const meta = {
            name: 'connector.update_service_type',
            pathParts: {
                connector_id: params.connector_id
            }
        };
        return await this.transport.request({ path, method, querystring, body, meta }, options);
    }
    async updateStatus(params, options) {
        const acceptedPath = ['connector_id'];
        const acceptedBody = ['status'];
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
        const path = `/_connector/${encodeURIComponent(params.connector_id.toString())}/_status`;
        const meta = {
            name: 'connector.update_status',
            pathParts: {
                connector_id: params.connector_id
            }
        };
        return await this.transport.request({ path, method, querystring, body, meta }, options);
    }
}
exports.default = Connector;
//# sourceMappingURL=connector.js.map