/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { DataViewBase } from '../../..';
import type { KqlWildcardNode } from '../../node_types/wildcard';
import type { KqlLiteralNode } from '../../node_types/literal';
import * as ast from '../../ast';
import * as wildcard from '../../node_types/wildcard';

export function getFields(node: KqlLiteralNode | KqlWildcardNode, indexPattern?: DataViewBase) {
  if (!indexPattern) return [];
  if (node.type === 'literal') {
    const fieldName = ast.toElasticsearchQuery(node);
    const field = indexPattern.fields.find((fld) => fld.name === fieldName);
    return field ? [field] : [];
  } else if (node.type === 'wildcard') {
    return indexPattern.fields.filter((fld) => wildcard.test(node, fld.name));
  }
}
