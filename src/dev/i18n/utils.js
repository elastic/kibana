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
  isCallExpression,
  isIdentifier,
  isObjectProperty,
  isMemberExpression,
  isNode,
} from '@babel/types';
import fs from 'fs';
import glob from 'glob';
import { promisify } from 'util';

const ESCAPE_LINE_BREAK_REGEX = /(?<!\\)\\\n/g;

export const readFileAsync = promisify(fs.readFile);
export const writeFileAsync = promisify(fs.writeFile);
export const globAsync = promisify(glob);
const mkdirAsync = promisify(fs.mkdir);
const accessAsync = promisify(fs.access);

export function makeDirAsync(path) {
  mkdirAsync(path, fs.constants.S_IWUSR);
}

export function pathExists(path) {
  accessAsync(path, fs.constants.W_OK);
}

export function isPropertyWithKey(property, identifierName) {
  return (
    isObjectProperty(property) &&
    isIdentifier(property.key, { name: identifierName })
  );
}

/**
 * Detect angular i18n service call or `@kbn/i18n` translate function call.
 *
 * Service call example: `i18n('message-id', { defaultMessage: 'Message text'})`
 *
 * `@kbn/i18n` example: `i18n.translate('message-id', { defaultMessage: 'Message text'})`
 */
export function isI18nTranslateFunction(node) {
  return (
    isCallExpression(node) &&
    (isIdentifier(node.callee, { name: 'i18n' }) ||
      (isMemberExpression(node.callee) &&
        isIdentifier(node.callee.object, { name: 'i18n' }) &&
        isIdentifier(node.callee.property, { name: 'translate' })))
  );
}

export function escapeLineBreak(string) {
  return string.replace(ESCAPE_LINE_BREAK_REGEX, '');
}

export function* traverseNodes(nodes, extractMessagesFromNode) {
  for (const node of nodes) {
    let stop = false;
    let message;

    if (isNode(node)) {
      message = extractMessagesFromNode({
        node,
        stop() {
          stop = true;
        },
      });
    }

    if (message) {
      yield message;
    }

    if (stop) {
      break;
    }

    if (node && typeof node === 'object') {
      const values = Object.values(node).filter(
        value => value && typeof value === 'object'
      );

      if (values.length > 0) {
        yield* traverseNodes(values, extractMessagesFromNode);
      }
    }
  }
}
