/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { isPlainObjectType } from '../../../utils/is_plain_object_type';
import { DocumentNodeProcessor } from './types/document_node_processor';

/**
 * Creates a node processor to remove specified by `propNames` properties.
 */
export function createRemovePropsProcessor(propNames: string[]): DocumentNodeProcessor {
  return {
    onNodeLeave(node) {
      if (!isPlainObjectType(node)) {
        return;
      }

      for (const propName of propNames) {
        if (!Object.hasOwn(node, propName)) {
          continue;
        }

        delete node[propName];
      }
    },
  };
}
