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

import { $Values } from '@kbn/utility-types';
import { i18n } from '@kbn/i18n';

export const ColorMode = Object.freeze({
  Background: 'Background' as 'Background',
  Labels: 'Labels' as 'Labels',
  None: 'None' as 'None',
});
export type ColorMode = $Values<typeof ColorMode>;

export const LabelRotation = Object.freeze({
  Horizontal: 0,
  Vertical: 90,
  Angled: 75,
});
export type LabelRotation = $Values<typeof LabelRotation>;

export const defaultCountLabel = i18n.translate('charts.countText', {
  defaultMessage: 'Count',
});
