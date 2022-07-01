/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { KibanaExecutionContext } from '@kbn/core-execution-context-common';
import type { ExpressionRenderContext } from './types';

export const extractRenderContext = (
  context?: KibanaExecutionContext
): ExpressionRenderContext | undefined => {
  if (context) {
    const recursiveGet = (item: KibanaExecutionContext): KibanaExecutionContext | undefined => {
      if (item.child) {
        return recursiveGet(item.child);
      } else {
        return item.child;
      }
    };

    const deepestChild = recursiveGet(context);

    if (deepestChild) {
      return {
        originatingApp: deepestChild.type,
      };
    }
  }
};
