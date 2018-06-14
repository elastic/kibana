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

import { parse } from '@babel/parser';
import traverse from '@babel/traverse';
import {
  isIdentifier,
  isObjectExpression,
  isStringLiteral,
} from '@babel/types';

function readKeySubTree(node) {
  if (isStringLiteral(node)) {
    return node.value;
  }
  if (isIdentifier(node)) {
    return node.name;
  }
}

function getDuplicates(node, parentPath) {
  const keys = [];
  const duplicates = [];

  for (const property of node.properties) {
    const key = readKeySubTree(property.key);
    const nodePath = `${parentPath}.${key}`;

    if (!duplicates.includes(nodePath)) {
      if (!keys.includes(nodePath)) {
        keys.push(nodePath);
      } else {
        duplicates.push(nodePath);
      }
    }

    if (isObjectExpression(property.value)) {
      duplicates.push(...getDuplicates(property.value, `${parentPath}.${key}`));
    }
  }

  return duplicates;
}

export function verifyJSON(json, fileName) {
  const jsonAST = parse(`+${json}`);
  let namespace = '';

  traverse(jsonAST, {
    enter(path) {
      if (isObjectExpression(path.node)) {
        if (path.node.properties.length !== 1) {
          throw new Error(
            `Locale file ${fileName} should be a JSON with a single-key object`
          );
        }
        if (!isObjectExpression(path.node.properties[0].value)) {
          throw new Error(`Invalid locale file: ${fileName}`);
        }

        namespace = readKeySubTree(path.node.properties[0].key);
        const duplicates = getDuplicates(
          path.node.properties[0].value,
          namespace
        );

        if (duplicates.length !== 0) {
          throw new Error(
            `There are translation id duplicates in locale file ${fileName}:
${duplicates.join(', ')}`
          );
        }

        path.stop();
      }
    },
  });

  return namespace;
}
