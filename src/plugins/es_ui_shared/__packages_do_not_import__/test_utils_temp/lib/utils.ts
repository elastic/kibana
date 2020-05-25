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

import Chance from 'chance';

const chance = new Chance();
const CHARS_POOL = 'abcdefghijklmnopqrstuvwxyz';

export const nextTick = (time = 0) => new Promise((resolve) => setTimeout(resolve, time));

export const getRandomNumber = (range: { min: number; max: number } = { min: 1, max: 20 }) =>
  chance.integer(range);

export const getRandomString = (options = {}) =>
  `${chance.string({ pool: CHARS_POOL, ...options })}-${Date.now()}`;
