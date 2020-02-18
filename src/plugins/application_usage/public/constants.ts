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

/*
 * Key for the localStorage service
 */
export const LOCALSTORAGE_KEY = 'application_usage.aggregated';
export const LOCALSTORAGE_KEY_LAST_REPORTED = 'application_usage.lastReported';

/**
 * List of appIds not to report usage from (due to legacy hacks)
 */
export const DO_NOT_REPORT = ['kibana'];

/**
 * Report to server every 10 minutes
 */
export const REPORT_INTERVAL = 10 * 60 * 1000;
