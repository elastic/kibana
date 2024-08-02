/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { pick } from 'lodash';
import { logger } from '../../../logger';
import { hasProp } from '../../../utils/has_prop';
import { X_LABELS } from '../../known_custom_props';
import { DocumentNode } from '../types/node';
import { DocumentNodeProcessor } from './types/document_node_processor';

/**
 * Creates a node processor to include only OAS operation objects labeled
 * with one or more of the provided via `labelsToInclude` labels.
 */
export function createIncludeLabelsProcessor(labelsToInclude: string[]): DocumentNodeProcessor {
  if (labelsToInclude.length === 0) {
    throw new Error('"labelsToInclude" must have at least one label.');
  }

  const canNodeHaveLabels = (node: Readonly<DocumentNode>): boolean => {
    // Currently, x-labels can be applied only to operations (path + method).
    // Each operation object has a `responses` field.
    // https://swagger.io/docs/specification/paths-and-operations/
    return 'responses' in node;
  };
  const logUnsupportedNodeWarning = (location: string, labelsValue: unknown): void => {
    const value = Array.isArray(labelsValue) ? labelsValue.join(', ') : labelsValue;

    logger.warning(
      `"${X_LABELS}: ${value}" in ${location} is ignored since "${X_LABELS}" is supported only for Operation objects.`
    );
  };
  const logInvalidLabelsValueWarning = (location: string, labelsValue: unknown) => {
    logger.warning(
      `"${X_LABELS}" in ${location} is ignored since an array of labels is expected but got "${JSON.stringify(
        labelsValue
      )}".`
    );
  };
  const KNOWN_HTTP_METHODS = ['head', 'get', 'post', 'patch', 'put', 'options', 'delete', 'trace'];

  return {
    shouldRemove(node, { parentKey }) {
      const isValidNode = canNodeHaveLabels(node);
      const nodeLabels = X_LABELS in node ? node[X_LABELS] : undefined;

      if (!isValidNode) {
        if (nodeLabels) {
          // x-labels can't be applied to this node.
          // We log a warning, but the node should still be included.
          logUnsupportedNodeWarning(parentKey.toString(), nodeLabels);
        }

        return false;
      }

      if (!nodeLabels) {
        return true;
      }

      if (!Array.isArray(nodeLabels)) {
        // x-labels value is not valid.
        // We log a warning and remove the node because it doesn't contain the needed labels.
        logInvalidLabelsValueWarning(parentKey.toString(), nodeLabels);

        return true;
      }

      const hasAllExpectedLabels = labelsToInclude.every((label) => nodeLabels.includes(label));

      // if an operation object has all labels from labelsToInclude
      // leave it in the resulting bundle by returning `false`
      return !hasAllExpectedLabels;
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

        // We need to check HTTP verbs only
        // If there are no HTTP verbs the path definition is considered empty
        const httpVerbs = pick(pathObject, KNOWN_HTTP_METHODS);

        if (Object.keys(httpVerbs).length === 0) {
          delete node.paths[path as keyof typeof node.paths];
        }
      }
    },
  };
}
