/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { NodePath, VisitNodeFunction } from '@babel/traverse';
import { codeFrameColumns } from '@babel/code-frame';
import { VisitorContext, PluginState } from './types';
import { JestMockExpression } from '../../traverse/types';

/**
 * Checks if the preceding line contains a comment that opts out of jest mock rewriting
 */
function hasOptOutComment(path: NodePath<JestMockExpression>): boolean {
  const comments = path.parent.leadingComments;
  if (!comments || comments.length === 0) {
    return false;
  }

  // Check if any preceding comment contains the opt-out pattern
  return comments.some((comment) =>
    comment.value.trim().includes('kbn-dependency-resolver:keep-jest-mock')
  );
}

export function createJestVisitor<S extends PluginState>(
  visitorContext: VisitorContext
): VisitNodeFunction<S, JestMockExpression> {
  return function (path) {
    // Skip if engineer has opted out via comment
    if (hasOptOutComment(path)) {
      return;
    }

    const modulePath = path.node.arguments[0].value;
    const state = path.state;

    // Check if there's a rewrite available for this module
    visitorContext.withEdgeRewrite(null, modulePath, (rewrite) => {
      const code = state.file?.code || '';

      // Create helpful error message with suggestion
      const suggestion =
        `Consider updating the Jest mock to use the rewritten path:\n` +
        `  jest.mock('${rewrite.filePath}');\n\n` +
        `Or if you need to keep the original mock, add this comment on the preceding line:\n` +
        `  // kbn-dependency-resolver:keep-jest-mock`;

      const error = new Error(
        codeFrameColumns(code, path.node.loc!, {
          message: `Jest mock for '${modulePath}' should be updated to '${rewrite.filePath}'. ${suggestion}`,
        })
      );

      throw error;
    });
  };
}
