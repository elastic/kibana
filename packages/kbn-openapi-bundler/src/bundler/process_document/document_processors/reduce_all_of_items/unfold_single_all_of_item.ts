/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { DocumentNodeProcessor } from '../types/document_node_processor';

/**
 * Created a node processor to remove/unfold `allOf` with only single item.
 *
 * While a schema can be defined like that the most often reason why `allOf` has
 * only one item is flattening folded `allOf` items via `flattenFoldedAllOfItems`
 * node processor.
 *
 * Example:
 *
 * The following single item `allOf`
 *
 * ```yaml
 * allOf:
 *   - type: object
 *     properties:
 *       fieldA:
 *         $ref: '#/components/schemas/FieldA'
 * ```
 *
 * will be transformed to
 *
 * ```yaml
 * type: object
 * properties:
 *   fieldA:
 *     $ref: '#/components/schemas/FieldA'
 * ```
 *
 */
export function createUnfoldSingleAllOfItemProcessor(): DocumentNodeProcessor {
  return {
    onNodeLeave(node) {
      if (!('allOf' in node) || !Array.isArray(node.allOf) || node.allOf.length > 1) {
        return;
      }

      Object.assign(node, node.allOf[0]);
      delete node.allOf;
    },
  };
}
