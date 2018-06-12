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

import {
  isConditionalExpression,
  isIdentifier,
  isObjectProperty,
  isStringLiteral,
} from '@babel/types';
import fs from 'fs';
import glob from 'glob';
import { promisify } from 'util';

import { ESCAPE_LINE_BREAK_REGEX } from './constants';

export const readFileAsync = promisify(fs.readFile);
export const writeFileAsync = promisify(fs.writeFile);
export const makeDirAsync = promisify(fs.mkdir);
export const globAsync = promisify(glob);

export async function pathExists(path) {
  await promisify(fs.access)(path, fs.constants.F_OK);
}

export function isPropertyWithKey(property, identifierName) {
  return (
    isObjectProperty(property) &&
    isIdentifier(property.key, { name: identifierName })
  );
}

/**
 * Parse an angular expression with a string literal or consitional expresssion.
 * @param subTree Babel parser AST node.
 * @returns {string[]} Array of expression ids
 */
export function parseConditionalOperatorAST(subTree) {
  if (isStringLiteral(subTree)) {
    // Subtree contains a single message id
    return [subTree.value];
  }

  if (isConditionalExpression(subTree)) {
    /*
    Subtree contains a conditional expression:
    subTree.test ? subTree.consequent : subTree.alternate
    There may be a nested conditional expression, so consequent and alternate should be parsed too
    */
    return parseConditionalOperatorAST(subTree.consequent).concat(
      parseConditionalOperatorAST(subTree.alternate)
    );
  }

  return [];
}

export function throwEntryException(exception, entry) {
  throw new Error(`Error in ${entry}\n${exception.message || exception}`);
}

export function escapeLineBreak(string) {
  return string.replace(ESCAPE_LINE_BREAK_REGEX, '');
}
