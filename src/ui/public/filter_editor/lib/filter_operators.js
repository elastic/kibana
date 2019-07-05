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

import _ from 'lodash';

import { i18n } from '@kbn/i18n';

export const FILTER_OPERATORS = [
  {
    name: i18n.translate('common.ui.filterEditor.operators.isLabel', {
      defaultMessage: 'is'
    }),
    type: 'phrase',
    negate: false,
  },
  {
    name: i18n.translate('common.ui.filterEditor.operators.isNotLabel', {
      defaultMessage: 'is not'
    }),
    type: 'phrase',
    negate: true,
  },
  {
    name: i18n.translate('common.ui.filterEditor.operators.isOneOfLabel', {
      defaultMessage: 'is one of'
    }),
    type: 'phrases',
    negate: false,
    fieldTypes: ['string', 'number', 'date', 'ip', 'geo_point', 'geo_shape']
  },
  {
    name: i18n.translate('common.ui.filterEditor.operators.isNotOneOfLabel', {
      defaultMessage: 'is not one of'
    }),
    type: 'phrases',
    negate: true,
    fieldTypes: ['string', 'number', 'date', 'ip', 'geo_point', 'geo_shape']
  },
  {
    name: i18n.translate('common.ui.filterEditor.operators.isBetweenLabel', {
      defaultMessage: 'is between'
    }),
    type: 'range',
    negate: false,
    fieldTypes: ['number', 'date', 'ip'],
  },
  {
    name: i18n.translate('common.ui.filterEditor.operators.isNotBetweenLabel', {
      defaultMessage: 'is not between'
    }),
    type: 'range',
    negate: true,
    fieldTypes: ['number', 'date', 'ip'],
  },
  {
    name: i18n.translate('common.ui.filterEditor.operators.existsLabel', {
      defaultMessage: 'exists'
    }),
    type: 'exists',
    negate: false,
  },
  {
    name: i18n.translate('common.ui.filterEditor.operators.doesNotExistLabel', {
      defaultMessage: 'does not exist'
    }),
    type: 'exists',
    negate: true,
  },
];

export const FILTER_OPERATOR_TYPES = _(FILTER_OPERATORS)
  .map('type')
  .uniq()
  .value();
