/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import Chance from 'chance';

const chance = new Chance();
const CHARS_POOL = 'abcdefghijklmnopqrstuvwxyz';

export const getRandomNumber = (range: { min: number; max: number } = { min: 1, max: 20 }) =>
  chance.integer(range);

export const getRandomString = (options = {}) =>
  `${chance.string({ pool: CHARS_POOL, ...options })}-${Date.now()}`;
