/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
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
