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
async function IndexApi(params, options) {
    var _a;
    const acceptedPath = ['id', 'index'];
    const acceptedBody = ['document'];
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
    if (params.index != null && params.id != null) {
        method = 'PUT';
        path = `/${encodeURIComponent(params.index.toString())}/_doc/${encodeURIComponent(params.id.toString())}`;
    }
    else {
        method = 'POST';
        path = `/${encodeURIComponent(params.index.toString())}/_doc`;
    }
    const meta = {
        name: 'index',
        pathParts: {
            id: params.id,
            index: params.index
        }
    };
    return await this.transport.request({ path, method, querystring, body, meta }, options);
}
exports.default = IndexApi;
//# sourceMappingURL=index.js.map