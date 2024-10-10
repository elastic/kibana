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
class Security {
    constructor(transport) {
        Object.defineProperty(this, "transport", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        this.transport = transport;
    }
    async activateUserProfile(params, options) {
        const acceptedPath = [];
        const acceptedBody = ['access_token', 'grant_type', 'password', 'username'];
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
        const path = '/_security/profile/_activate';
        const meta = {
            name: 'security.activate_user_profile'
        };
        return await this.transport.request({ path, method, querystring, body, meta }, options);
    }
    async authenticate(params, options) {
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
        const path = '/_security/_authenticate';
        const meta = {
            name: 'security.authenticate'
        };
        return await this.transport.request({ path, method, querystring, body, meta }, options);
    }
    async bulkDeleteRole(params, options) {
        const acceptedPath = [];
        const acceptedBody = ['names'];
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
        const method = 'DELETE';
        const path = '/_security/role';
        const meta = {
            name: 'security.bulk_delete_role'
        };
        return await this.transport.request({ path, method, querystring, body, meta }, options);
    }
    async bulkPutRole(params, options) {
        const acceptedPath = [];
        const acceptedBody = ['roles'];
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
        const path = '/_security/role';
        const meta = {
            name: 'security.bulk_put_role'
        };
        return await this.transport.request({ path, method, querystring, body, meta }, options);
    }
    async bulkUpdateApiKeys(params, options) {
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
        const path = '/_security/api_key/_bulk_update';
        const meta = {
            name: 'security.bulk_update_api_keys'
        };
        return await this.transport.request({ path, method, querystring, body, meta }, options);
    }
    async changePassword(params, options) {
        const acceptedPath = ['username'];
        const acceptedBody = ['password', 'password_hash'];
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
        if (params.username != null) {
            method = 'PUT';
            path = `/_security/user/${encodeURIComponent(params.username.toString())}/_password`;
        }
        else {
            method = 'PUT';
            path = '/_security/user/_password';
        }
        const meta = {
            name: 'security.change_password',
            pathParts: {
                username: params.username
            }
        };
        return await this.transport.request({ path, method, querystring, body, meta }, options);
    }
    async clearApiKeyCache(params, options) {
        const acceptedPath = ['ids'];
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
        const path = `/_security/api_key/${encodeURIComponent(params.ids.toString())}/_clear_cache`;
        const meta = {
            name: 'security.clear_api_key_cache',
            pathParts: {
                ids: params.ids
            }
        };
        return await this.transport.request({ path, method, querystring, body, meta }, options);
    }
    async clearCachedPrivileges(params, options) {
        const acceptedPath = ['application'];
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
        const path = `/_security/privilege/${encodeURIComponent(params.application.toString())}/_clear_cache`;
        const meta = {
            name: 'security.clear_cached_privileges',
            pathParts: {
                application: params.application
            }
        };
        return await this.transport.request({ path, method, querystring, body, meta }, options);
    }
    async clearCachedRealms(params, options) {
        const acceptedPath = ['realms'];
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
        const path = `/_security/realm/${encodeURIComponent(params.realms.toString())}/_clear_cache`;
        const meta = {
            name: 'security.clear_cached_realms',
            pathParts: {
                realms: params.realms
            }
        };
        return await this.transport.request({ path, method, querystring, body, meta }, options);
    }
    async clearCachedRoles(params, options) {
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
        const path = `/_security/role/${encodeURIComponent(params.name.toString())}/_clear_cache`;
        const meta = {
            name: 'security.clear_cached_roles',
            pathParts: {
                name: params.name
            }
        };
        return await this.transport.request({ path, method, querystring, body, meta }, options);
    }
    async clearCachedServiceTokens(params, options) {
        const acceptedPath = ['namespace', 'service', 'name'];
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
        const path = `/_security/service/${encodeURIComponent(params.namespace.toString())}/${encodeURIComponent(params.service.toString())}/credential/token/${encodeURIComponent(params.name.toString())}/_clear_cache`;
        const meta = {
            name: 'security.clear_cached_service_tokens',
            pathParts: {
                namespace: params.namespace,
                service: params.service,
                name: params.name
            }
        };
        return await this.transport.request({ path, method, querystring, body, meta }, options);
    }
    async createApiKey(params, options) {
        const acceptedPath = [];
        const acceptedBody = ['expiration', 'name', 'role_descriptors', 'metadata'];
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
        const path = '/_security/api_key';
        const meta = {
            name: 'security.create_api_key'
        };
        return await this.transport.request({ path, method, querystring, body, meta }, options);
    }
    async createCrossClusterApiKey(params, options) {
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
        const path = '/_security/cross_cluster/api_key';
        const meta = {
            name: 'security.create_cross_cluster_api_key'
        };
        return await this.transport.request({ path, method, querystring, body, meta }, options);
    }
    async createServiceToken(params, options) {
        const acceptedPath = ['namespace', 'service', 'name'];
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
        if (params.namespace != null && params.service != null && params.name != null) {
            method = 'PUT';
            path = `/_security/service/${encodeURIComponent(params.namespace.toString())}/${encodeURIComponent(params.service.toString())}/credential/token/${encodeURIComponent(params.name.toString())}`;
        }
        else {
            method = 'POST';
            path = `/_security/service/${encodeURIComponent(params.namespace.toString())}/${encodeURIComponent(params.service.toString())}/credential/token`;
        }
        const meta = {
            name: 'security.create_service_token',
            pathParts: {
                namespace: params.namespace,
                service: params.service,
                name: params.name
            }
        };
        return await this.transport.request({ path, method, querystring, body, meta }, options);
    }
    async deletePrivileges(params, options) {
        const acceptedPath = ['application', 'name'];
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
        const path = `/_security/privilege/${encodeURIComponent(params.application.toString())}/${encodeURIComponent(params.name.toString())}`;
        const meta = {
            name: 'security.delete_privileges',
            pathParts: {
                application: params.application,
                name: params.name
            }
        };
        return await this.transport.request({ path, method, querystring, body, meta }, options);
    }
    async deleteRole(params, options) {
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
        const path = `/_security/role/${encodeURIComponent(params.name.toString())}`;
        const meta = {
            name: 'security.delete_role',
            pathParts: {
                name: params.name
            }
        };
        return await this.transport.request({ path, method, querystring, body, meta }, options);
    }
    async deleteRoleMapping(params, options) {
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
        const path = `/_security/role_mapping/${encodeURIComponent(params.name.toString())}`;
        const meta = {
            name: 'security.delete_role_mapping',
            pathParts: {
                name: params.name
            }
        };
        return await this.transport.request({ path, method, querystring, body, meta }, options);
    }
    async deleteServiceToken(params, options) {
        const acceptedPath = ['namespace', 'service', 'name'];
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
        const path = `/_security/service/${encodeURIComponent(params.namespace.toString())}/${encodeURIComponent(params.service.toString())}/credential/token/${encodeURIComponent(params.name.toString())}`;
        const meta = {
            name: 'security.delete_service_token',
            pathParts: {
                namespace: params.namespace,
                service: params.service,
                name: params.name
            }
        };
        return await this.transport.request({ path, method, querystring, body, meta }, options);
    }
    async deleteUser(params, options) {
        const acceptedPath = ['username'];
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
        const path = `/_security/user/${encodeURIComponent(params.username.toString())}`;
        const meta = {
            name: 'security.delete_user',
            pathParts: {
                username: params.username
            }
        };
        return await this.transport.request({ path, method, querystring, body, meta }, options);
    }
    async disableUser(params, options) {
        const acceptedPath = ['username'];
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
        const path = `/_security/user/${encodeURIComponent(params.username.toString())}/_disable`;
        const meta = {
            name: 'security.disable_user',
            pathParts: {
                username: params.username
            }
        };
        return await this.transport.request({ path, method, querystring, body, meta }, options);
    }
    async disableUserProfile(params, options) {
        const acceptedPath = ['uid'];
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
        const path = `/_security/profile/${encodeURIComponent(params.uid.toString())}/_disable`;
        const meta = {
            name: 'security.disable_user_profile',
            pathParts: {
                uid: params.uid
            }
        };
        return await this.transport.request({ path, method, querystring, body, meta }, options);
    }
    async enableUser(params, options) {
        const acceptedPath = ['username'];
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
        const path = `/_security/user/${encodeURIComponent(params.username.toString())}/_enable`;
        const meta = {
            name: 'security.enable_user',
            pathParts: {
                username: params.username
            }
        };
        return await this.transport.request({ path, method, querystring, body, meta }, options);
    }
    async enableUserProfile(params, options) {
        const acceptedPath = ['uid'];
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
        const path = `/_security/profile/${encodeURIComponent(params.uid.toString())}/_enable`;
        const meta = {
            name: 'security.enable_user_profile',
            pathParts: {
                uid: params.uid
            }
        };
        return await this.transport.request({ path, method, querystring, body, meta }, options);
    }
    async enrollKibana(params, options) {
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
        const path = '/_security/enroll/kibana';
        const meta = {
            name: 'security.enroll_kibana'
        };
        return await this.transport.request({ path, method, querystring, body, meta }, options);
    }
    async enrollNode(params, options) {
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
        const path = '/_security/enroll/node';
        const meta = {
            name: 'security.enroll_node'
        };
        return await this.transport.request({ path, method, querystring, body, meta }, options);
    }
    async getApiKey(params, options) {
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
        const path = '/_security/api_key';
        const meta = {
            name: 'security.get_api_key'
        };
        return await this.transport.request({ path, method, querystring, body, meta }, options);
    }
    async getBuiltinPrivileges(params, options) {
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
        const path = '/_security/privilege/_builtin';
        const meta = {
            name: 'security.get_builtin_privileges'
        };
        return await this.transport.request({ path, method, querystring, body, meta }, options);
    }
    async getPrivileges(params, options) {
        const acceptedPath = ['application', 'name'];
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
        if (params.application != null && params.name != null) {
            method = 'GET';
            path = `/_security/privilege/${encodeURIComponent(params.application.toString())}/${encodeURIComponent(params.name.toString())}`;
        }
        else if (params.application != null) {
            method = 'GET';
            path = `/_security/privilege/${encodeURIComponent(params.application.toString())}`;
        }
        else {
            method = 'GET';
            path = '/_security/privilege';
        }
        const meta = {
            name: 'security.get_privileges',
            pathParts: {
                application: params.application,
                name: params.name
            }
        };
        return await this.transport.request({ path, method, querystring, body, meta }, options);
    }
    async getRole(params, options) {
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
            path = `/_security/role/${encodeURIComponent(params.name.toString())}`;
        }
        else {
            method = 'GET';
            path = '/_security/role';
        }
        const meta = {
            name: 'security.get_role',
            pathParts: {
                name: params.name
            }
        };
        return await this.transport.request({ path, method, querystring, body, meta }, options);
    }
    async getRoleMapping(params, options) {
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
            path = `/_security/role_mapping/${encodeURIComponent(params.name.toString())}`;
        }
        else {
            method = 'GET';
            path = '/_security/role_mapping';
        }
        const meta = {
            name: 'security.get_role_mapping',
            pathParts: {
                name: params.name
            }
        };
        return await this.transport.request({ path, method, querystring, body, meta }, options);
    }
    async getServiceAccounts(params, options) {
        const acceptedPath = ['namespace', 'service'];
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
        if (params.namespace != null && params.service != null) {
            method = 'GET';
            path = `/_security/service/${encodeURIComponent(params.namespace.toString())}/${encodeURIComponent(params.service.toString())}`;
        }
        else if (params.namespace != null) {
            method = 'GET';
            path = `/_security/service/${encodeURIComponent(params.namespace.toString())}`;
        }
        else {
            method = 'GET';
            path = '/_security/service';
        }
        const meta = {
            name: 'security.get_service_accounts',
            pathParts: {
                namespace: params.namespace,
                service: params.service
            }
        };
        return await this.transport.request({ path, method, querystring, body, meta }, options);
    }
    async getServiceCredentials(params, options) {
        const acceptedPath = ['namespace', 'service'];
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
        const path = `/_security/service/${encodeURIComponent(params.namespace.toString())}/${encodeURIComponent(params.service.toString())}/credential`;
        const meta = {
            name: 'security.get_service_credentials',
            pathParts: {
                namespace: params.namespace,
                service: params.service
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
                querystring[key] = params[key];
            }
        }
        const method = 'GET';
        const path = '/_security/settings';
        const meta = {
            name: 'security.get_settings'
        };
        return await this.transport.request({ path, method, querystring, body, meta }, options);
    }
    async getToken(params, options) {
        const acceptedPath = [];
        const acceptedBody = ['grant_type', 'scope', 'password', 'kerberos_ticket', 'refresh_token', 'username'];
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
        const path = '/_security/oauth2/token';
        const meta = {
            name: 'security.get_token'
        };
        return await this.transport.request({ path, method, querystring, body, meta }, options);
    }
    async getUser(params, options) {
        const acceptedPath = ['username'];
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
        if (params.username != null) {
            method = 'GET';
            path = `/_security/user/${encodeURIComponent(params.username.toString())}`;
        }
        else {
            method = 'GET';
            path = '/_security/user';
        }
        const meta = {
            name: 'security.get_user',
            pathParts: {
                username: params.username
            }
        };
        return await this.transport.request({ path, method, querystring, body, meta }, options);
    }
    async getUserPrivileges(params, options) {
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
        const path = '/_security/user/_privileges';
        const meta = {
            name: 'security.get_user_privileges'
        };
        return await this.transport.request({ path, method, querystring, body, meta }, options);
    }
    async getUserProfile(params, options) {
        const acceptedPath = ['uid'];
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
        const path = `/_security/profile/${encodeURIComponent(params.uid.toString())}`;
        const meta = {
            name: 'security.get_user_profile',
            pathParts: {
                uid: params.uid
            }
        };
        return await this.transport.request({ path, method, querystring, body, meta }, options);
    }
    async grantApiKey(params, options) {
        const acceptedPath = [];
        const acceptedBody = ['api_key', 'grant_type', 'access_token', 'username', 'password', 'run_as'];
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
        const path = '/_security/api_key/grant';
        const meta = {
            name: 'security.grant_api_key'
        };
        return await this.transport.request({ path, method, querystring, body, meta }, options);
    }
    async hasPrivileges(params, options) {
        const acceptedPath = ['user'];
        const acceptedBody = ['application', 'cluster', 'index'];
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
        if (params.user != null) {
            method = body != null ? 'POST' : 'GET';
            path = `/_security/user/${encodeURIComponent(params.user.toString())}/_has_privileges`;
        }
        else {
            method = body != null ? 'POST' : 'GET';
            path = '/_security/user/_has_privileges';
        }
        const meta = {
            name: 'security.has_privileges',
            pathParts: {
                user: params.user
            }
        };
        return await this.transport.request({ path, method, querystring, body, meta }, options);
    }
    async hasPrivilegesUserProfile(params, options) {
        const acceptedPath = [];
        const acceptedBody = ['uids', 'privileges'];
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
        const method = body != null ? 'POST' : 'GET';
        const path = '/_security/profile/_has_privileges';
        const meta = {
            name: 'security.has_privileges_user_profile'
        };
        return await this.transport.request({ path, method, querystring, body, meta }, options);
    }
    async invalidateApiKey(params, options) {
        const acceptedPath = [];
        const acceptedBody = ['id', 'ids', 'name', 'owner', 'realm_name', 'username'];
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
        const method = 'DELETE';
        const path = '/_security/api_key';
        const meta = {
            name: 'security.invalidate_api_key'
        };
        return await this.transport.request({ path, method, querystring, body, meta }, options);
    }
    async invalidateToken(params, options) {
        const acceptedPath = [];
        const acceptedBody = ['token', 'refresh_token', 'realm_name', 'username'];
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
        const method = 'DELETE';
        const path = '/_security/oauth2/token';
        const meta = {
            name: 'security.invalidate_token'
        };
        return await this.transport.request({ path, method, querystring, body, meta }, options);
    }
    async oidcAuthenticate(params, options) {
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
        const path = '/_security/oidc/authenticate';
        const meta = {
            name: 'security.oidc_authenticate'
        };
        return await this.transport.request({ path, method, querystring, body, meta }, options);
    }
    async oidcLogout(params, options) {
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
        const path = '/_security/oidc/logout';
        const meta = {
            name: 'security.oidc_logout'
        };
        return await this.transport.request({ path, method, querystring, body, meta }, options);
    }
    async oidcPrepareAuthentication(params, options) {
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
        const path = '/_security/oidc/prepare';
        const meta = {
            name: 'security.oidc_prepare_authentication'
        };
        return await this.transport.request({ path, method, querystring, body, meta }, options);
    }
    async putPrivileges(params, options) {
        var _a;
        const acceptedPath = [];
        const acceptedBody = ['privileges'];
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
        const method = 'PUT';
        const path = '/_security/privilege';
        const meta = {
            name: 'security.put_privileges'
        };
        return await this.transport.request({ path, method, querystring, body, meta }, options);
    }
    async putRole(params, options) {
        const acceptedPath = ['name'];
        const acceptedBody = ['applications', 'cluster', 'global', 'indices', 'metadata', 'run_as', 'description', 'transient_metadata'];
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
        const path = `/_security/role/${encodeURIComponent(params.name.toString())}`;
        const meta = {
            name: 'security.put_role',
            pathParts: {
                name: params.name
            }
        };
        return await this.transport.request({ path, method, querystring, body, meta }, options);
    }
    async putRoleMapping(params, options) {
        const acceptedPath = ['name'];
        const acceptedBody = ['enabled', 'metadata', 'roles', 'role_templates', 'rules', 'run_as'];
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
        const path = `/_security/role_mapping/${encodeURIComponent(params.name.toString())}`;
        const meta = {
            name: 'security.put_role_mapping',
            pathParts: {
                name: params.name
            }
        };
        return await this.transport.request({ path, method, querystring, body, meta }, options);
    }
    async putUser(params, options) {
        const acceptedPath = [];
        const acceptedBody = ['username', 'email', 'full_name', 'metadata', 'password', 'password_hash', 'roles', 'enabled'];
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
        const path = `/_security/user/${encodeURIComponent(params.username.toString())}`;
        const meta = {
            name: 'security.put_user',
            pathParts: {
                username: params.username
            }
        };
        return await this.transport.request({ path, method, querystring, body, meta }, options);
    }
    async queryApiKeys(params, options) {
        const acceptedPath = [];
        const acceptedBody = ['aggregations', 'aggs', 'query', 'from', 'sort', 'size', 'search_after'];
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
        const path = '/_security/_query/api_key';
        const meta = {
            name: 'security.query_api_keys'
        };
        return await this.transport.request({ path, method, querystring, body, meta }, options);
    }
    async queryRole(params, options) {
        const acceptedPath = [];
        const acceptedBody = ['query', 'from', 'sort', 'size', 'search_after'];
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
        const path = '/_security/_query/role';
        const meta = {
            name: 'security.query_role'
        };
        return await this.transport.request({ path, method, querystring, body, meta }, options);
    }
    async queryUser(params, options) {
        const acceptedPath = [];
        const acceptedBody = ['query', 'from', 'sort', 'size', 'search_after'];
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
        const path = '/_security/_query/user';
        const meta = {
            name: 'security.query_user'
        };
        return await this.transport.request({ path, method, querystring, body, meta }, options);
    }
    async samlAuthenticate(params, options) {
        const acceptedPath = [];
        const acceptedBody = ['content', 'ids', 'realm'];
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
        const path = '/_security/saml/authenticate';
        const meta = {
            name: 'security.saml_authenticate'
        };
        return await this.transport.request({ path, method, querystring, body, meta }, options);
    }
    async samlCompleteLogout(params, options) {
        const acceptedPath = [];
        const acceptedBody = ['realm', 'ids', 'query_string', 'content'];
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
        const path = '/_security/saml/complete_logout';
        const meta = {
            name: 'security.saml_complete_logout'
        };
        return await this.transport.request({ path, method, querystring, body, meta }, options);
    }
    async samlInvalidate(params, options) {
        const acceptedPath = [];
        const acceptedBody = ['acs', 'query_string', 'realm'];
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
        const path = '/_security/saml/invalidate';
        const meta = {
            name: 'security.saml_invalidate'
        };
        return await this.transport.request({ path, method, querystring, body, meta }, options);
    }
    async samlLogout(params, options) {
        const acceptedPath = [];
        const acceptedBody = ['token', 'refresh_token'];
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
        const path = '/_security/saml/logout';
        const meta = {
            name: 'security.saml_logout'
        };
        return await this.transport.request({ path, method, querystring, body, meta }, options);
    }
    async samlPrepareAuthentication(params, options) {
        const acceptedPath = [];
        const acceptedBody = ['acs', 'realm', 'relay_state'];
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
        const path = '/_security/saml/prepare';
        const meta = {
            name: 'security.saml_prepare_authentication'
        };
        return await this.transport.request({ path, method, querystring, body, meta }, options);
    }
    async samlServiceProviderMetadata(params, options) {
        const acceptedPath = ['realm_name'];
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
        const path = `/_security/saml/metadata/${encodeURIComponent(params.realm_name.toString())}`;
        const meta = {
            name: 'security.saml_service_provider_metadata',
            pathParts: {
                realm_name: params.realm_name
            }
        };
        return await this.transport.request({ path, method, querystring, body, meta }, options);
    }
    async suggestUserProfiles(params, options) {
        const acceptedPath = [];
        const acceptedBody = ['name', 'size', 'data', 'hint'];
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
        const path = '/_security/profile/_suggest';
        const meta = {
            name: 'security.suggest_user_profiles'
        };
        return await this.transport.request({ path, method, querystring, body, meta }, options);
    }
    async updateApiKey(params, options) {
        const acceptedPath = ['id'];
        const acceptedBody = ['role_descriptors', 'metadata', 'expiration'];
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
        const path = `/_security/api_key/${encodeURIComponent(params.id.toString())}`;
        const meta = {
            name: 'security.update_api_key',
            pathParts: {
                id: params.id
            }
        };
        return await this.transport.request({ path, method, querystring, body, meta }, options);
    }
    async updateCrossClusterApiKey(params, options) {
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
        const path = `/_security/cross_cluster/api_key/${encodeURIComponent(params.id.toString())}`;
        const meta = {
            name: 'security.update_cross_cluster_api_key',
            pathParts: {
                id: params.id
            }
        };
        return await this.transport.request({ path, method, querystring, body, meta }, options);
    }
    async updateSettings(params, options) {
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
        const method = 'PUT';
        const path = '/_security/settings';
        const meta = {
            name: 'security.update_settings'
        };
        return await this.transport.request({ path, method, querystring, body, meta }, options);
    }
    async updateUserProfileData(params, options) {
        const acceptedPath = ['uid'];
        const acceptedBody = ['labels', 'data'];
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
        const path = `/_security/profile/${encodeURIComponent(params.uid.toString())}/_data`;
        const meta = {
            name: 'security.update_user_profile_data',
            pathParts: {
                uid: params.uid
            }
        };
        return await this.transport.request({ path, method, querystring, body, meta }, options);
    }
}
exports.default = Security;
//# sourceMappingURL=security.js.map