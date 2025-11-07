/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { type Document, isPair, isScalar, visit } from 'yaml';
import { getPathFromAncestors } from '../../../../common/lib/yaml';
import type { StepNameInfo } from '../model/types';

export function collectAllStepNames(yamlDocument: Document): StepNameInfo[] {
  const stepNames: StepNameInfo[] = [];

  if (!yamlDocument?.contents || yamlDocument.errors.length > 0) {
    return stepNames;
  }

  visit(yamlDocument, {
    Scalar(key, node, ancestors) {
      if (!node.range) {
        return;
      }

      const lastAncestor = ancestors?.[ancestors.length - 1];
      const isNameProp =
        isPair(lastAncestor) && isScalar(lastAncestor.key) && lastAncestor.key.value === 'name';

      if (!isNameProp || !node.value) {
        return;
      }

      // Make sure we're looking at the VALUE of a name property, not the key itself
      // The key "name" will also be a scalar, but it will be the key of the pair, not the value
      const isNameValue = isPair(lastAncestor) && lastAncestor.value === node;

      if (!isNameValue) {
        return;
      }

      // Use the same logic as getStepNode to identify step names
      const path = getPathFromAncestors(ancestors);
      const isInSteps =
        path.length >= 3 && (path[path.length - 3] === 'steps' || path[path.length - 3] === 'else');

      if (isInSteps) {
        const [startOffset, endOffset] = node.range;

        // Convert byte offsets to line/column positions
        const text = yamlDocument.toString();
        let line = 1;
        let column = 1;
        let startLine = 1;
        let startCol = 1;
        let endLine = 1;
        let endCol = 1;

        for (let i = 0; i < text.length; i++) {
          if (i === startOffset) {
            startLine = line;
            startCol = column;
          }
          if (i === endOffset) {
            endLine = line;
            endCol = column;
            break;
          }
          if (text[i] === '\n') {
            line++;
            column = 1;
          } else {
            column++;
          }
        }

        stepNames.push({
          name: node.value as string,
          node,
          startLineNumber: startLine,
          startColumn: startCol,
          endLineNumber: endLine,
          endColumn: endCol,
        });
      }
    },
  });

  return stepNames;
}
