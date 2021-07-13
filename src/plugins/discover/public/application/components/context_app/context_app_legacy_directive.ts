/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ContextApp } from './context_app';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function createContextAppLegacy(reactDirective: any) {
  return reactDirective(ContextApp, [
    ['indexPattern', { watchDepth: 'reference' }],
    ['indexPatternId', { watchDepth: 'reference' }],
    ['anchorId', { watchDepth: 'reference' }],
  ]);
}
