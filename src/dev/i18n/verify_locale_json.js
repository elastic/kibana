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
import { isObjectExpression } from '@babel/types';

import { traverseNodes } from './utils';

export function verifyJSON(json) {
  const jsonAST = parse(`+${json}`);
  let namespace = '';

  traverseNodes(jsonAST.program.body, ({ node, stop }) => {
    if (!isObjectExpression(node)) {
      return;
    }

    if (!node.properties.some(prop => prop.key.name === 'formats')) {
      throw 'Locale file should contain formats object.';
    }

    for (const property of node.properties) {
      if (property.key.name !== 'formats') {
        const messageNamespace = property.key.value.split('.')[0];
        if (!namespace) {
          namespace = messageNamespace;
        }

        if (namespace !== messageNamespace) {
          throw 'All messages should start with the same namespace.';
        }
      }
    }

    const idsSet = new Set();
    for (const id of node.properties.map(prop => prop.key.value)) {
      if (idsSet.has(id)) {
        throw `Ids duplicate: ${id}`;
      }
      idsSet.add(id);
    }

    stop();
  }).next();

  return namespace;
}
