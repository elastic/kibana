"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.ES_CERT_PATH = exports.ES_KEY_PATH = exports.CA_CERT_PATH = void 0;

var _path = require("path");

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
const CA_CERT_PATH = (0, _path.resolve)(__dirname, 'ca.crt');
exports.CA_CERT_PATH = CA_CERT_PATH;
const ES_KEY_PATH = (0, _path.resolve)(__dirname, 'elasticsearch.key');
exports.ES_KEY_PATH = ES_KEY_PATH;
const ES_CERT_PATH = (0, _path.resolve)(__dirname, 'elasticsearch.crt');
exports.ES_CERT_PATH = ES_CERT_PATH;