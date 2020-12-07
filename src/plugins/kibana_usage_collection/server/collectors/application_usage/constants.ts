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

/**
 * Roll total indices every 24h
 */
export const ROLL_TOTAL_INDICES_INTERVAL = 24 * 60 * 60 * 1000;

/**
 * Roll daily indices every 30 minutes.
 * This means that, assuming a user can visit all the 44 apps we can possibly report
 * in the 3 minutes interval the browser reports to the server, up to 22 users can have the same
 * behaviour and we wouldn't need to paginate in the transactional documents (less than 10k docs).
 *
 * Based on a more normal expected use case, the users could visit up to 5 apps in those 3 minutes,
 * allowing up to 200 users before reaching the limit.
 */
export const ROLL_DAILY_INDICES_INTERVAL = 30 * 60 * 1000;

/**
 * Start rolling indices after 5 minutes up
 */
export const ROLL_INDICES_START = 5 * 60 * 1000;
