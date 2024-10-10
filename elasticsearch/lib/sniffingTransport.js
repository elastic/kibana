"use strict";
/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License") you may
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
const tslib_1 = require("tslib");
const assert_1 = tslib_1.__importDefault(require("assert"));
const transport_1 = require("@elastic/transport");
class SniffingTransport extends transport_1.Transport {
    sniff(opts) {
        var _a;
        if (this.isSniffing)
            return;
        this.isSniffing = true;
        const request = {
            method: 'GET',
            path: (_a = this.sniffEndpoint) !== null && _a !== void 0 ? _a : '/_nodes/_all/http'
        };
        this.request(request, { id: opts.requestId, meta: true })
            .then(result => {
            var _a, _b;
            (0, assert_1.default)(isObject(result.body), 'The body should be an object');
            this.isSniffing = false;
            const protocol = (_b = (_a = result.meta.connection) === null || _a === void 0 ? void 0 : _a.url.protocol) !== null && _b !== void 0 ? _b : 'http:';
            const hosts = this.connectionPool.nodesToHost(result.body.nodes, protocol);
            this.connectionPool.update(hosts);
            result.meta.sniff = { hosts, reason: opts.reason };
            this.diagnostic.emit('sniff', null, result);
        })
            .catch(err => {
            this.isSniffing = false;
            err.meta.sniff = { hosts: [], reason: opts.reason };
            this.diagnostic.emit('sniff', err, null);
        });
    }
}
exports.default = SniffingTransport;
function isObject(obj) {
    return typeof obj === 'object';
}
//# sourceMappingURL=sniffingTransport.js.map