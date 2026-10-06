/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { SnakeCasedKeys } from './types';
/**
 * This function takes an object and recursively converts all of the keys to `snaked_cased`
 * @param input The object with `camelCased` keys
 * @returns The object with `snake_cased` keys
 */
export declare const convertCamelCasedKeysToSnakeCase: <StateType extends object = object>(
  input: StateType
) => SnakeCasedKeys<StateType>;
