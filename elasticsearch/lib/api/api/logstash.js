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
class Logstash {
    constructor(transport) {
        Object.defineProperty(this, "transport", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        this.transport = transport;
    }
    async deletePipeline(params, options) {
        const acceptedPath = ['id'];
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
        const path = `/_logstash/pipeline/${encodeURIComponent(params.id.toString())}`;
        const meta = {
            name: 'logstash.delete_pipeline',
            pathParts: {
                id: params.id
            }
        };
        return await this.transport.request({ path, method, querystring, body, meta }, options);
    }
    async getPipeline(params, options) {
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
            path = `/_logstash/pipeline/${encodeURIComponent(params.id.toString())}`;
        }
        else {
            method = 'GET';
            path = '/_logstash/pipeline';
        }
        const meta = {
            name: 'logstash.get_pipeline',
            pathParts: {
                id: params.id
            }
        };
        return await this.transport.request({ path, method, querystring, body, meta }, options);
    }
    async putPipeline(params, options) {
        var _a;
        const acceptedPath = ['id'];
        const acceptedBody = ['pipeline'];
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
        const path = `/_logstash/pipeline/${encodeURIComponent(params.id.toString())}`;
        const meta = {
            name: 'logstash.put_pipeline',
            pathParts: {
                id: params.id
            }
        };
        return await this.transport.request({ path, method, querystring, body, meta }, options);
    }
}
exports.default = Logstash;
//# sourceMappingURL=logstash.js.map