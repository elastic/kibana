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

// Field types
export const FIELD_TYPES = {
  TEXT: 'text',
  TEXTAREA: 'textarea',
  NUMBER: 'number',
  TOGGLE: 'toggle',
  CHECKBOX: 'checkbox',
  COMBO_BOX: 'comboBox',
  RADIO_GROUP: 'radioGroup',
  RANGE: 'range',
  SELECT: 'select',
  SUPER_SELECT: 'superSelect',
  MULTI_SELECT: 'multiSelect',
};

// Validation types
export const VALIDATION_TYPES = {
  FIELD: 'field', // Default validation error (on the field value)
  ASYNC: 'async', // Returned from asynchronous validations
  ARRAY_ITEM: 'arrayItem', // If the field value is an Array, this error would be returned if an _item_ of the array is invalid
};
