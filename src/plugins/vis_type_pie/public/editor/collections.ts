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

import { i18n } from '@kbn/i18n';
import { LabelPositions, ValueFormats } from '../types';

export const getLabelPositions = () => [
  {
    text: i18n.translate('visTypePie.labelPositions.insideText', {
      defaultMessage: 'Inside',
    }),
    value: LabelPositions.INSIDE,
  },
  {
    text: i18n.translate('visTypePie.labelPositions.insideOrOutsideText', {
      defaultMessage: 'Inside or outside',
    }),
    value: LabelPositions.DEFAULT,
  },
];

export const getValuesFormats = () => [
  {
    text: i18n.translate('visTypePie.valuesFormats.percent', {
      defaultMessage: 'Show percent',
    }),
    value: ValueFormats.PERCENT,
  },
  {
    text: i18n.translate('visTypePie.valuesFormats.value', {
      defaultMessage: 'Show value',
    }),
    value: ValueFormats.VALUE,
  },
];
