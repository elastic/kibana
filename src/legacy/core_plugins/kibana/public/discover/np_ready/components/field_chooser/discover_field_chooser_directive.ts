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
import { wrapInI18nContext } from '../../../kibana_services';
import { DiscoverFieldChooser } from './discover_field_chooser';

export function createDiscoverFieldChooserDirective(reactDirective: any) {
  return reactDirective(wrapInI18nContext(DiscoverFieldChooser), [
    ['computeDetails', { watchDepth: 'reference' }],
    ['fields', { watchDepth: 'reference' }],
    ['fieldTypes', { watchDepth: 'reference' }],
    ['filter', { watchDepth: 'reference' }],
    ['groupedFields', { watchDepth: 'reference' }],
    ['indexPatternList', { watchDepth: 'reference' }],
    ['onAddField', { watchDepth: 'reference' }],
    ['onAddFilter', { watchDepth: 'reference' }],
    ['onRemoveField', { watchDepth: 'reference' }],
    ['onShowDetails', { watchDepth: 'reference' }],
    ['onShowFields', { watchDepth: 'reference' }],
    ['openFields', { watchDepth: 'reference' }],
    ['popularFields', { watchDepth: 'reference' }],
    ['selectedIndexPattern', { watchDepth: 'reference' }],
    ['setFilterValue', { watchDepth: 'reference' }],
    ['setIndexPattern', { watchDepth: 'reference' }],
    ['showDetails', { watchDepth: 'reference' }],
    ['showFields', { watchDepth: 'reference' }],
    ['unpopularFields', { watchDepth: 'reference' }],
  ]);
}
