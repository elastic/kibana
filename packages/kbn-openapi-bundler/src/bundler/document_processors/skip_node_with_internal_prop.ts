/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { DocumentNodeProcessor } from '../types';

/**
 * Creates a node processor to skip nodes having provided `skipProperty` property
 * and omit them from the result document.
 */
export function createSkipNodeWithInternalPropProcessor(
  skipProperty: string
): DocumentNodeProcessor {
  return {
    enter: (node) => skipProperty in node,
  };
}
