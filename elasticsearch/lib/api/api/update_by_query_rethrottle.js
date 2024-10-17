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
async function UpdateByQueryRethrottleApi(params, options) {
    const acceptedPath = ['task_id'];
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
    const path = `/_update_by_query/${encodeURIComponent(params.task_id.toString())}/_rethrottle`;
    const meta = {
        name: 'update_by_query_rethrottle',
        pathParts: {
            task_id: params.task_id
        }
    };
    return await this.transport.request({ path, method, querystring, body, meta }, options);
}
exports.default = UpdateByQueryRethrottleApi;
//# sourceMappingURL=update_by_query_rethrottle.js.map