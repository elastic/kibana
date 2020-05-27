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

export const ColorModes = Object.freeze({
  BACKGROUND: 'Background' as 'Background',
  LABELS: 'Labels' as 'Labels',
  NONE: 'None' as 'None',
});
export type ColorModes = $Values<typeof ColorModes>;

export const Rotates = Object.freeze({
  HORIZONTAL: 0,
  VERTICAL: 90,
  ANGLED: 75,
});
export type Rotates = $Values<typeof Rotates>;
