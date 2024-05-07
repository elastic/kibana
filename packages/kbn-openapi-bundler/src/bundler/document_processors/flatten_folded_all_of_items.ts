/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { DocumentNodeProcessor } from '../types';

export function createFlattenFoldedAllOfItemsProcessor(): DocumentNodeProcessor {
  return {
    leave(node) {
      if (!('allOf' in node) || !Array.isArray(node.allOf)) {
        return;
      }

      for (let i = 0; i < node.allOf.length; ++i) {
        const childNode = node.allOf[i];

        if ('allOf' in childNode) {
          node.allOf.splice(i, 1, ...childNode.allOf);

          i += childNode.allOf.length - 1;
        }
      }
    },
  };
}
