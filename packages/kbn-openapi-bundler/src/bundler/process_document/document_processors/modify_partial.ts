/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { DocumentNodeProcessor } from './types/document_node_processor';
import { hasProp } from '../../../utils/has_prop';
import { X_MODIFY } from '../../known_custom_props';
import { inlineRef } from './utils/inline_ref';

/**
 * Creates a node processor to modify a node by removing `required` property when
 * `x-modify: partial` property is presented in the node.
 */
export function createModifyPartialProcessor(): DocumentNodeProcessor {
  return {
    onRefNodeLeave(node, resolvedRef) {
      if (!hasProp(node, X_MODIFY, 'partial')) {
        return;
      }

      // Inline the ref node because we are gonna modify it
      inlineRef(node, resolvedRef);

      delete node.required;
    },
    onNodeLeave(node) {
      if (!hasProp(node, X_MODIFY, 'partial')) {
        return;
      }

      delete node.required;
    },
  };
}
