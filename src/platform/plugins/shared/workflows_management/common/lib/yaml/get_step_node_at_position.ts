/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Document, YAMLMap } from 'yaml';
import { visit } from 'yaml';
import { getPathFromAncestors } from '@kbn/workflows/common/utils/yaml';

export function getStepNodeAtPosition(
  document: Document,
  absolutePosition: number
): YAMLMap | null {
  let stepNode: YAMLMap | null = null;
  visit(document, {
    Map(key, node, ancestors) {
      if (!node.range) {
        return;
      }
      const path = getPathFromAncestors(ancestors);

      const hasTypeProp = typeof node.get('type') === 'string';

      if (!hasTypeProp) {
        return;
      }

      const isInSteps = path.includes('steps') || path.includes('else');

      if (isInSteps && absolutePosition >= node.range[0] && absolutePosition <= node.range[2]) {
        // assign first found node
        stepNode = node;
        // but continue to find the deepest node
      }
    },
  });
  return stepNode;
}
