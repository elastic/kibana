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

export const CONSOLE_REQUEST_TELEMETRY_SAVED_OBJECTS_TYPE = 'console-telemetry-requests-count';
export const CONSOLE_REQUEST_TELEMETRY_SAVED_OBJECTS_ID = 'console-telemetry-requests-count';

export { fetchRequests } from './fetch_requests';
export { incrementRequestCounter } from './record_request';

export { register } from './register';
