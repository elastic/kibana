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

import 'ngreact';
import { wrapInI18nContext } from 'ui/i18n';
import { uiModules } from '../../../modules';
import { DefaultEditorAggParams } from './components/default_editor_agg_params';

uiModules
  .get('app/visualize')
  .directive('visEditorAggParams', reactDirective => reactDirective(wrapInI18nContext(DefaultEditorAggParams), [
    ['agg', { watchDepth: 'reference' }],
    ['aggParams', { watchDepth: 'collection' }],
    ['indexPattern', { watchDepth: 'reference' }],
    ['responseValueAggs', { watchDepth: 'reference' }], // we watch reference to identify each aggs change in useEffects
    ['state', { watchDepth: 'reference' }],
    ['onAggErrorChanged', { watchDepth: 'reference' }],
    ['onAggTypeChange', { watchDepth: 'reference' }],
    ['onAggParamsChange', { watchDepth: 'reference' }],
    ['setTouched', { watchDepth: 'reference' }],
    ['setValidity', { watchDepth: 'reference' }],
    'aggError',
    'aggIndex',
    'groupName',
    'aggIsTooLow',
    'formIsTouched'
  ]));
