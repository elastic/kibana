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
class QueryRules {
    constructor(transport) {
        Object.defineProperty(this, "transport", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        this.transport = transport;
    }
    async deleteRule(params, options) {
        const acceptedPath = ['ruleset_id', 'rule_id'];
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
        const path = `/_query_rules/${encodeURIComponent(params.ruleset_id.toString())}/_rule/${encodeURIComponent(params.rule_id.toString())}`;
        const meta = {
            name: 'query_rules.delete_rule',
            pathParts: {
                ruleset_id: params.ruleset_id,
                rule_id: params.rule_id
            }
        };
        return await this.transport.request({ path, method, querystring, body, meta }, options);
    }
    async deleteRuleset(params, options) {
        const acceptedPath = ['ruleset_id'];
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
        const path = `/_query_rules/${encodeURIComponent(params.ruleset_id.toString())}`;
        const meta = {
            name: 'query_rules.delete_ruleset',
            pathParts: {
                ruleset_id: params.ruleset_id
            }
        };
        return await this.transport.request({ path, method, querystring, body, meta }, options);
    }
    async getRule(params, options) {
        const acceptedPath = ['ruleset_id', 'rule_id'];
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
        const path = `/_query_rules/${encodeURIComponent(params.ruleset_id.toString())}/_rule/${encodeURIComponent(params.rule_id.toString())}`;
        const meta = {
            name: 'query_rules.get_rule',
            pathParts: {
                ruleset_id: params.ruleset_id,
                rule_id: params.rule_id
            }
        };
        return await this.transport.request({ path, method, querystring, body, meta }, options);
    }
    async getRuleset(params, options) {
        const acceptedPath = ['ruleset_id'];
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
        const path = `/_query_rules/${encodeURIComponent(params.ruleset_id.toString())}`;
        const meta = {
            name: 'query_rules.get_ruleset',
            pathParts: {
                ruleset_id: params.ruleset_id
            }
        };
        return await this.transport.request({ path, method, querystring, body, meta }, options);
    }
    async listRulesets(params, options) {
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
        const path = '/_query_rules';
        const meta = {
            name: 'query_rules.list_rulesets'
        };
        return await this.transport.request({ path, method, querystring, body, meta }, options);
    }
    async putRule(params, options) {
        const acceptedPath = ['ruleset_id', 'rule_id'];
        const acceptedBody = ['type', 'criteria', 'actions', 'priority'];
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
        const path = `/_query_rules/${encodeURIComponent(params.ruleset_id.toString())}/_rule/${encodeURIComponent(params.rule_id.toString())}`;
        const meta = {
            name: 'query_rules.put_rule',
            pathParts: {
                ruleset_id: params.ruleset_id,
                rule_id: params.rule_id
            }
        };
        return await this.transport.request({ path, method, querystring, body, meta }, options);
    }
    async putRuleset(params, options) {
        const acceptedPath = ['ruleset_id'];
        const acceptedBody = ['rules'];
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
        const path = `/_query_rules/${encodeURIComponent(params.ruleset_id.toString())}`;
        const meta = {
            name: 'query_rules.put_ruleset',
            pathParts: {
                ruleset_id: params.ruleset_id
            }
        };
        return await this.transport.request({ path, method, querystring, body, meta }, options);
    }
}
exports.default = QueryRules;
//# sourceMappingURL=query_rules.js.map