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
async function TermsEnumApi(params, options) {
    const acceptedPath = ['index'];
    const acceptedBody = ['field', 'size', 'timeout', 'case_insensitive', 'index_filter', 'string', 'search_after'];
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
    const path = `/${encodeURIComponent(params.index.toString())}/_terms_enum`;
    const meta = {
        name: 'terms_enum',
        pathParts: {
            index: params.index
        }
    };
    return await this.transport.request({ path, method, querystring, body, meta }, options);
}
exports.default = TermsEnumApi;
//# sourceMappingURL=terms_enum.js.map