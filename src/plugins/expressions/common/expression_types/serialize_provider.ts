/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { ExpressionType } from './expression_type';
import { ExpressionValue } from './types';
import { getType } from './get_type';

const identity = <T>(x: T) => x;

export const serializeProvider = (types: Record<string, ExpressionType>) => ({
  serialize: (value: ExpressionValue) => (types[getType(value)].serialize || identity)(value),
  deserialize: (value: ExpressionValue) => (types[getType(value)].deserialize || identity)(value),
});
