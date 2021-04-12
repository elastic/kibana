/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

export function getType(node) {
  if (node == null) return 'null';
  if (typeof node === 'object') {
    if (!node.type) throw new Error('Objects must have a type property');
    return node.type;
  }

  return typeof node;
}
