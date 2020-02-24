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
  UiSettingsType,
  StringValidation,
  ImageValidation,
  SavedObjectAttribute,
} from '../../../../core/public';

export interface FieldSetting {
  displayName: string;
  name: string;
  value: SavedObjectAttribute;
  description?: string;
  options?: string[];
  optionLabels?: Record<string, string>;
  requiresPageReload: boolean;
  type: UiSettingsType;
  category: string[];
  ariaName: string;
  isOverridden: boolean;
  defVal: SavedObjectAttribute;
  isCustom: boolean;
  validation?: StringValidation | ImageValidation;
  readOnly?: boolean;
  deprecation?: {
    message: string;
    docLinksKey: string;
  };
}

// until eui searchbar and query are typed
export interface IQuery {
  ast: any; // incomplete
  text: string;
  syntax: any; // incomplete
}
