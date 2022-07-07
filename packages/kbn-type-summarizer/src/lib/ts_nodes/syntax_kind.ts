/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import ts from 'typescript';

export function assertKind<T extends ts.Node>(
  node: ts.Node,
  test: (n: ts.Node) => n is T
): asserts node is T {
  if (!test(node)) {
    throw new Error(
      `expected node to match [${test.name}], actual kind: ${ts.SyntaxKind[node.kind]}`
    );
  }
}
