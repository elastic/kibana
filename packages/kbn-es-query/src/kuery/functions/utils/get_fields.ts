/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import * as literal from '../../node_types/literal';
import * as wildcard from '../../node_types/wildcard';
import { DataViewBase, KueryNode } from '../../../..';

export function getFields(node: KueryNode, indexPattern?: DataViewBase) {
  if (!indexPattern) return [];
  if (literal.isNode(node)) {
    const fieldName = literal.toElasticsearchQuery(node);
    const field = indexPattern.fields.find((fld) => fld.name === fieldName);
    if (!field) {
      return [];
    }
    return [field];
  } else if (wildcard.isNode(node)) {
    const fields = indexPattern.fields.filter((fld) => wildcard.test(node, fld.name));
    return fields;
  }
}
