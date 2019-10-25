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


import { getFields } from './get_fields';

export function getFullFieldNameNode(rootNameNode, indexPattern, nestedPath) {
  const fullFieldNameNode = {
    ...rootNameNode,
    value: nestedPath ? `${nestedPath}.${rootNameNode.value}` : rootNameNode.value
  };

  // Wildcards can easily include nested and non-nested fields. There isn't a good way to let
  // users handle this themselves so we automatically add nested queries in this scenario and skip the
  // error checking below.
  if (!indexPattern || (fullFieldNameNode.type === 'wildcard' && !nestedPath)) {
    return fullFieldNameNode;
  }
  const fields = getFields(fullFieldNameNode, indexPattern);

  const errors = fields.reduce((acc, field) => {
    const nestedPathFromField = field.subType && field.subType.nested ? field.subType.nested.path : undefined;

    if (nestedPath && !nestedPathFromField) {
      return [...acc, `${field.name} is not a nested field but is in nested group "${nestedPath}" in the KQL expression.`];
    }

    if (nestedPathFromField && !nestedPath) {
      return [...acc, `${field.name} is a nested field, but is not in a nested group in the KQL expression.`];
    }

    if (nestedPathFromField !== nestedPath) {
      return [
        ...acc,
        `Nested field ${field.name} is being queried with the incorrect nested path. The correct path is ${field.subType.nested.path}.`
      ];
    }

    return acc;
  }, []);

  if (errors.length > 0) {
    throw new Error(errors.join('\n'));
  }

  return fullFieldNameNode;
}
