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

export const RANDOM_NUMBER_ROUTE_PATH = '/api/random_number';

export const RANDOM_NUMBER_BETWEEN_ROUTE_PATH = '/api/random_number_between';

export const POST_MESSAGE_ROUTE_PATH = '/api/post_message';

// Internal APIs should use the `internal` prefix, instead of the `api` prefix.
export const INTERNAL_GET_MESSAGE_BY_ID_ROUTE = '/internal/get_message';
