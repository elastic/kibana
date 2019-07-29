"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.adminTestUser = exports.kibanaServerTestUser = exports.kibanaTestUser = void 0;

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
const env = process.env;
const kibanaTestUser = {
  username: env.TEST_KIBANA_USER || 'elastic',
  password: env.TEST_KIBANA_PASS || 'changeme'
};
exports.kibanaTestUser = kibanaTestUser;
const kibanaServerTestUser = {
  username: env.TEST_KIBANA_SERVER_USER || 'kibana',
  password: env.TEST_KIBANA_SERVER_PASS || 'changeme'
};
exports.kibanaServerTestUser = kibanaServerTestUser;
const adminTestUser = {
  username: env.TEST_ES_USER || 'elastic',
  password: env.TEST_ES_PASS || 'changeme'
};
exports.adminTestUser = adminTestUser;