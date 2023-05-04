/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { Ast } from './ast';
import { parse } from '../parse';

export function fromExpression(expression: string, type = 'expression'): Ast {
  try {
    return parse(String(expression), { startRule: type });
  } catch (e) {
    throw new Error(`Unable to parse expression: ${e.message}`);
  }
}
