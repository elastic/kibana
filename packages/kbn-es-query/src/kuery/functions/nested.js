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

import * as ast from '../ast';
import { uniq } from 'lodash';

export function buildNodeParams(child) {
  return {
    arguments: [child],
  };
}

export function toElasticsearchQuery(node, indexPattern, config) {
  if (!indexPattern) {
    throw new Error('Cannot use nested queries without an index pattern');
  }

  const [child] = node.arguments;

  const targetSubFields = ast.getTargetFields(child);
  const indexPatternFields = indexPattern.fields.filter(field => targetSubFields.includes(field.name));
  const parentFields = uniq(indexPatternFields.map(field => field.parent));

  if (parentFields.length > 1) {
    throw new Error('nested query cannot target more than one path');
  }
  if (parentFields.length === 0) {
    throw new Error('nested query does not contain a nested field');
  }

  const parentField = indexPattern.fields.find(field => field.name === parentFields[0]);

  return {
    nested: {
      path: generatePath(parentField, indexPattern),
      query: ast.toElasticsearchQuery(child, indexPattern, config),
      score_mode: 'none',
    },
  };
}

export function getTargetFields(node, indexPattern) {
  const [child] = node.arguments;
  const targetSubFields = ast.getTargetFields(child);
  const indexPatternFields = indexPattern.fields.filter(field => targetSubFields.includes(field.name));
  const parentFields = uniq(indexPatternFields.map(field => field.parent));

  if (parentFields.length > 1) {
    throw new Error('nested query cannot target more than one path');
  }

  return parentFields.length > 0 ? [parentFields[0]] : [];
}

function generatePath(field, indexPattern) {
  if (!field.subType || field.subType !== 'nested') {
    return field.name;
  }

  const parent = indexPattern.fields.find(indexPatternField => indexPatternField.name === field.parent);

  return `${generatePath(parent)}.${field.name}}`;
}
