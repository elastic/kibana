/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { logger } from '../../../logger';
import { hasProp } from '../../../utils/has_prop';
import { X_LABELS } from '../../known_custom_props';
import { DocumentNode } from '../types/node';
import { DocumentNodeProcessor } from './types/document_node_processor';

/**
 * Creates a node processor to exclude nodes having only one of provided tags.
 */
export function createIncludeXLabelsProcessor(labelsToInclude: string[]): DocumentNodeProcessor {
  if (labelsToInclude.length === 0) {
    throw new Error('"labelsToInclude" must have as minimum one label.');
  }

  const labelsToIncludeSet = new Set(labelsToInclude);
  // Labels are only restricted to operations objects.
  // An operation object must have `responses` field.
  const canHaveLabels = (node: Readonly<DocumentNode>): boolean => {
    return 'responses' in node;
  };
  const logUnsupportedNodeWarning = (location: string, xLabelsValue: unknown): void => {
    const value = Array.isArray(xLabelsValue) ? xLabelsValue.join(', ') : xLabelsValue;

    logger.warning(
      `"${X_LABELS}: ${value}" in ${location} is ignored since "${X_LABELS}" is supported only for Operation objects.`
    );
  };

  return {
    shouldRemove(node, { parentKey }) {
      const isValidNode = canHaveLabels(node);

      if (!isValidNode && X_LABELS in node) {
        logUnsupportedNodeWarning(parentKey.toString(), node[X_LABELS]);
      }

      if (!isValidNode || !(X_LABELS in node) || !Array.isArray(node[X_LABELS])) {
        return false;
      }

      return node[X_LABELS].every((tag) => !labelsToIncludeSet.has(tag));
    },
    // Empty path objects after excluding all operation objects by `shouldRemove` have to be removed
    onNodeLeave(node, { isRootNode }) {
      if (
        !isRootNode ||
        !hasProp<string, unknown>(node, 'paths') ||
        typeof node.paths !== 'object' ||
        node.paths === null
      ) {
        return;
      }

      for (const [path, pathObject] of Object.entries(node.paths)) {
        if (typeof pathObject !== 'object' || pathObject === null) {
          continue;
        }

        if (Object.keys(pathObject).length === 0) {
          delete node.paths[path as keyof typeof node.paths];
        }
      }
    },
  };
}
