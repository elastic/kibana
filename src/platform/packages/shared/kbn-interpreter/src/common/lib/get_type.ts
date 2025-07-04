/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export function getType(node: any): string {
  if (node == null) return 'null';
  if (typeof node === 'object') {
    if (!node.type) throw new Error('Objects must have a type property');
    return node.type;
  }

  return typeof node;
}
