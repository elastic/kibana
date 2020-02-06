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

// This isn't ideal. We want to avoid searching for 20 indices
// then filtering out the majority of them because they are system indices.
// We'd like to filter system indices out in the query
// so if we can accomplish that in the future, this logic can go away
export const ESTIMATED_NUMBER_OF_SYSTEM_INDICES = 100;
export const MAX_NUMBER_OF_MATCHING_INDICES = 100;
export const MAX_SEARCH_SIZE = MAX_NUMBER_OF_MATCHING_INDICES + ESTIMATED_NUMBER_OF_SYSTEM_INDICES;

export const PER_PAGE_INCREMENTS = [5, 10, 20, 50];
