/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { DocumentNodeProcessor } from '../types';
import { hasProp } from '../../utils/has_prop';
import { inlineRef } from './utils/inline_ref';
import { X_MODIFY } from '../known_custom_props';

/**
 * Creates a node processor to modify a node by removing `required` property when
 * `x-modify: partial` property is presented in the node.
 */
export function createModifyPartialProcessor(): DocumentNodeProcessor {
  return {
    ref(node, resolvedRef) {
      if (!hasProp(node, X_MODIFY, 'partial')) {
        return;
      }

      // Inline the ref node because we are gonna modify it
      inlineRef(node, resolvedRef);

      delete node.required;
    },
    leave(node) {
      if (!hasProp(node, X_MODIFY, 'partial')) {
        return;
      }

      delete node.required;
    },
  };
}
