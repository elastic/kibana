/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { getFields } from './get_fields';
import { DataViewBase, DataViewFieldBase, KueryNode } from '../../..';
import { getDataViewFieldSubtypeNested } from '../../../utils';

export function getFullFieldNameNode(
  rootNameNode: any,
  indexPattern?: DataViewBase,
  nestedPath?: string
): KueryNode {
  const fullFieldNameNode = {
    ...rootNameNode,
    value: nestedPath ? `${nestedPath}.${rootNameNode.value}` : rootNameNode.value,
  };

  // Wildcards can easily include nested and non-nested fields. There isn't a good way to let
  // users handle this themselves so we automatically add nested queries in this scenario and skip the
  // error checking below.
  if (!indexPattern || (fullFieldNameNode.type === 'wildcard' && !nestedPath)) {
    return fullFieldNameNode;
  }
  const fields = getFields(fullFieldNameNode, indexPattern);

  const errors = fields!.reduce((acc: any, field: DataViewFieldBase) => {
    const subTypeNested = getDataViewFieldSubtypeNested(field);
    const nestedPathFromField = subTypeNested?.nested.path;

    if (nestedPath && !nestedPathFromField) {
      return [
        ...acc,
        `${field.name} is not a nested field but is in nested group "${nestedPath}" in the KQL expression.`,
      ];
    }

    if (nestedPathFromField && !nestedPath) {
      return [
        ...acc,
        `${field.name} is a nested field, but is not in a nested group in the KQL expression.`,
      ];
    }

    if (nestedPathFromField !== nestedPath) {
      return [
        ...acc,
        `Nested field ${field.name} is being queried with the incorrect nested path. The correct path is ${subTypeNested?.nested.path}.`,
      ];
    }

    return acc;
  }, []);

  if (errors.length > 0) {
    throw new Error(errors.join('\n'));
  }

  return fullFieldNameNode;
}
