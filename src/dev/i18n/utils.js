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

import fs from 'fs';
import glob from 'glob';
import { promisify } from 'util';
import { isNode } from '@babel/types';

export const readFileAsync = promisify(fs.readFile);
export const globAsync = promisify(glob);

export function arraysDiff(left = [], right = []) {
  const leftDiff = left.filter(value => !right.includes(value));
  const rightDiff = right.filter(value => !left.includes(value));
  return [leftDiff, rightDiff];
}

/**
 * Workaround of @babel/traverse typescript bug: https://github.com/babel/babel/issues/8262
 */
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
