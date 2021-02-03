/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { ContextAppLegacy } from './context_app_legacy';

export function createContextAppLegacy(reactDirective: any) {
  return reactDirective(ContextAppLegacy, [
    ['filter', { watchDepth: 'reference' }],
    ['hits', { watchDepth: 'reference' }],
    ['indexPattern', { watchDepth: 'reference' }],
    ['sorting', { watchDepth: 'reference' }],
    ['columns', { watchDepth: 'collection' }],
    ['minimumVisibleRows', { watchDepth: 'reference' }],
    ['status', { watchDepth: 'reference' }],
    ['reason', { watchDepth: 'reference' }],
    ['defaultStepSize', { watchDepth: 'reference' }],
    ['predecessorCount', { watchDepth: 'reference' }],
    ['predecessorAvailable', { watchDepth: 'reference' }],
    ['predecessorStatus', { watchDepth: 'reference' }],
    ['onChangePredecessorCount', { watchDepth: 'reference' }],
    ['successorCount', { watchDepth: 'reference' }],
    ['successorAvailable', { watchDepth: 'reference' }],
    ['successorStatus', { watchDepth: 'reference' }],
    ['onChangeSuccessorCount', { watchDepth: 'reference' }],
    ['useNewFieldsApi', { watchDepth: 'reference' }],
    ['topNavMenu', { watchDepth: 'reference' }],
  ]);
}
