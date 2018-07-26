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

  for (const node of traverseNodes(jsonAST.program.body)) {
    if (!isObjectExpression(node)) {
      continue;
    }

    if (!node.properties.some(prop => prop.key.name === 'formats')) {
      throw 'Locale file should contain formats object.';
    }

    const nameProperties = node.properties.filter(property => property.key.name !== 'formats');
    const namespaces = nameProperties.map(property => property.key.value.split('.')[0]);
    const uniqueNamespaces = new Set(namespaces);

    if (uniqueNamespaces.size !== 1) {
      throw 'All messages ids should start with the same namespace.';
    }

    const namespace = uniqueNamespaces.values().next().value;

    const idsSet = new Set();
    for (const id of node.properties.map(prop => prop.key.value)) {
      if (idsSet.has(id)) {
        throw `Ids collision: ${id}`;
      }
      idsSet.add(id);
    }

    return namespace;
  }
}
