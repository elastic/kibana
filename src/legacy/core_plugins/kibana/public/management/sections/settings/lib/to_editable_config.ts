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

import {
  UiSettingsParams,
  UserProvidedValues,
  StringValidationRegexString,
  SavedObjectAttribute,
} from 'src/core/public';
import { getValType } from './get_val_type';
import { getAriaName } from './get_aria_name';
import { DEFAULT_CATEGORY } from './default_category';

/**
 * @param {object} advanced setting definition object
 * @param {object} name of setting
 * @param {object} current value of setting
 * @returns {object} the editable config object
 */
export function toEditableConfig({
  def,
  name,
  value,
  isCustom,
  isOverridden,
}: {
  def: UiSettingsParams & UserProvidedValues<any>;
  name: string;
  value: SavedObjectAttribute;
  isCustom: boolean;
  isOverridden: boolean;
}) {
  if (!def) {
    def = {};
  }

  const validationTyped = def.validation as StringValidationRegexString;

  const conf = {
    name,
    displayName: def.name || name,
    ariaName: def.name || getAriaName(name),
    value,
    category: def.category && def.category.length ? def.category : [DEFAULT_CATEGORY],
    isCustom,
    isOverridden,
    readonly: !!def.readonly,
    defVal: def.value,
    type: getValType(def, value),
    description: def.description,
    deprecation: def.deprecation,
    validation:
      validationTyped && validationTyped.regexString
        ? {
            regex: new RegExp(validationTyped.regexString),
            message: validationTyped.message,
          }
        : def.validation,
    options: def.options,
    optionLabels: def.optionLabels,
    requiresPageReload: !!def.requiresPageReload,
  };

  return conf;
}
