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

/**
 * @param {object} advanced setting definition object
 * @param {?} current value of the setting
 * @returns {string} the type to use for determining the display and editor
 */

import { UiSettingsType } from 'src/core/public';
import { FieldSetting } from '../types';

export function getValType(def: Partial<FieldSetting>, value?: any): UiSettingsType {
  if (def.type) {
    return def.type;
  }

  if (Array.isArray(value) || Array.isArray(def.value)) {
    return 'array';
  }

  const typeofVal = def.value != null ? typeof def.value : typeof value;

  if (typeofVal === 'bigint') {
    return 'number';
  }

  if (typeofVal === 'symbol' || typeofVal === 'object' || typeofVal === 'function') {
    throw new Error(
      `incompatible UiSettingsType: '${def.name}' type ${typeofVal} | ${JSON.stringify(def)}`
    );
  }

  return typeofVal;
}
