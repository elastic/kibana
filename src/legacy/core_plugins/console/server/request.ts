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

import requestLib from 'request';
import util from 'util';

// Separate module for easier mocking during testing.

// We use the request library because Hapi, Axios, and Superagent don't support GET requests
// with bodies, but ES APIs do. Similarly with DELETE requests with bodies. If we need to
// deprecate use of this library, we can also solve this issue with Node's http library.
// See #39170 for details.
export const request = util.promisify(requestLib);
