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
 * Creates a node processor to only include OAS operation object labeled with one of the provided labels.
 */
export function createIncludeXLabelsProcessor(labelsToInclude: string[]): DocumentNodeProcessor {
  if (labelsToInclude.length === 0) {
    throw new Error('"labelsToInclude" must have at least one label.');
  }

  const labelsToIncludeSet = new Set(labelsToInclude);

  const canNodeHaveLabels = (node: Readonly<DocumentNode>): boolean => {
    // Currently, x-labels can be applied only to operations (path + method).
    // Each operation object has a `responses` field.
    // https://swagger.io/docs/specification/paths-and-operations/
    return 'responses' in node;
  };
  const logUnsupportedNodeWarning = (location: string, xLabelsValue: unknown): void => {
    const value = Array.isArray(xLabelsValue) ? xLabelsValue.join(', ') : xLabelsValue;

    logger.warning(
      `"${X_LABELS}: ${value}" in ${location} is ignored since "${X_LABELS}" is supported only for Operation objects.`
    );
  };
  const logInvalidLabelsValueWarning = (location: string, xLabelsValue: unknown) => {
    logger.warning(
      `"${X_LABELS}" in ${location} is ignored since an array of labels is expected but got "${JSON.stringify(
        xLabelsValue
      )}".`
    );
  };

  return {
    shouldRemove(node, { parentKey }) {
      const isValidNode = canNodeHaveLabels(node);
      const hasLabels = X_LABELS in node;

      if (!isValidNode) {
        if (hasLabels) {
          // x-labels can't be applied to this node.
          // We log a warning, but the node should still be included.
          logUnsupportedNodeWarning(parentKey.toString(), node[X_LABELS]);
        }

        return false;
      }

      if (!hasLabels) {
        return true;
      }

      if (!Array.isArray(node[X_LABELS])) {
        // x-labels value is not valid.
        // We log a warning and remove the node because it doesn't contain the needed labels.
        logInvalidLabelsValueWarning(parentKey.toString(), node[X_LABELS]);

        return true;
      }

      return node[X_LABELS].every((label) => !labelsToIncludeSet.has(label));
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
