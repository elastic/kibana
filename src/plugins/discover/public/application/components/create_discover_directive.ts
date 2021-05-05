/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { DiscoverWrapper } from './discover_wrapper';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function createDiscoverDirective(reactDirective: any) {
  return reactDirective(DiscoverWrapper, [
    ['angularRoute', { watchDepth: 'reference' }],
    ['indexPattern', { watchDepth: 'reference' }],
    ['opts', { watchDepth: 'reference' }],
    ['resetQuery', { watchDepth: 'reference' }],
    ['savedSearch', { watchDepth: 'reference' }],
    ['searchSource', { watchDepth: 'reference' }],
  ]);
}
