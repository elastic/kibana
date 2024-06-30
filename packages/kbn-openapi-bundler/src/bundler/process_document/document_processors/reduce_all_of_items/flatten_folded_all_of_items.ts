/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { DocumentNodeProcessor } from '../types/document_node_processor';

/**
 * Creates a node processor to flatten folded `allOf` items. Folded means `allOf` has items
 * which are another `allOf`s instead of being e.g. object schemas.
 *
 * Folded `allOf` schemas is usually a result of inlining references.
 *
 * Example:
 *
 * The following folded `allOf`s
 *
 * ```yaml
 * allOf:
 *   - allOf:
 *     - type: object
 *       properties:
 *         fieldA:
 *           $ref: '#/components/schemas/FieldA'
 *     - type: object
 *       properties:
 *         fieldB:
 *           type: string
 * ```
 *
 * will be transformed to
 *
 * ```yaml
 * allOf:
 *   - type: object
 *     properties:
 *       fieldA:
 *         $ref: '#/components/schemas/FieldA'
 *   - type: object
 *     properties:
 *       fieldB:
 *         type: string
 * ```
 *
 */
export function createFlattenFoldedAllOfItemsProcessor(): DocumentNodeProcessor {
  return {
    onNodeLeave(node) {
      if (!('allOf' in node) || !Array.isArray(node.allOf)) {
        return;
      }

      node.allOf = node.allOf.flatMap((childNode) =>
        'allOf' in childNode ? childNode.allOf : childNode
      );
    },
  };
}
