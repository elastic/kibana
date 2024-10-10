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
class TextStructure {
    constructor(transport) {
        Object.defineProperty(this, "transport", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        this.transport = transport;
    }
    async findFieldStructure(params, options) {
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
        const path = '/_text_structure/find_field_structure';
        const meta = {
            name: 'text_structure.find_field_structure'
        };
        return await this.transport.request({ path, method, querystring, body, meta }, options);
    }
    async findMessageStructure(params, options) {
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
        const method = body != null ? 'POST' : 'GET';
        const path = '/_text_structure/find_message_structure';
        const meta = {
            name: 'text_structure.find_message_structure'
        };
        return await this.transport.request({ path, method, querystring, body, meta }, options);
    }
    async findStructure(params, options) {
        var _a;
        const acceptedPath = [];
        const acceptedBody = ['text_files'];
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
        const path = '/_text_structure/find_structure';
        const meta = {
            name: 'text_structure.find_structure'
        };
        return await this.transport.request({ path, method, querystring, bulkBody: body, meta }, options);
    }
    async testGrokPattern(params, options) {
        const acceptedPath = [];
        const acceptedBody = ['grok_pattern', 'text'];
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
        const path = '/_text_structure/test_grok_pattern';
        const meta = {
            name: 'text_structure.test_grok_pattern'
        };
        return await this.transport.request({ path, method, querystring, body, meta }, options);
    }
}
exports.default = TextStructure;
//# sourceMappingURL=text_structure.js.map