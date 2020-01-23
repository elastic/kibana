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

import { ExpressionAstExpression, ExpressionAst } from './types';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { parse: parseRaw } = require('@kbn/interpreter/common');

/**
 * Parses a string to a specific expression AST node.
 *
 * @param str String to parse.
 * @param startRule Name of expression AST node to use to start parsing.
 */
export function parse(
  str: string,
  startRule: 'expression' | 'function' | 'argument' = 'expression'
): ExpressionAst {
  try {
    return parseRaw(String(str), { startRule });
  } catch (e) {
    throw new Error(`Unable to parse expression: ${e.message}`);
  }
}

/**
 * Given expression pipeline string, returns parsed AST.
 *
 * @param str Expression pipeline string.
 */
export function parseExpression(str: string): ExpressionAstExpression {
  return parse(str, 'expression') as ExpressionAstExpression;
}
