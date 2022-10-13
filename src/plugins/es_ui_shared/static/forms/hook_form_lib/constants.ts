/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
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
  JSON: 'json',
};

// Validation types
export const VALIDATION_TYPES = {
  /** Default validation error (on the field value) */
  FIELD: 'field',
  /** Returned from asynchronous validations */
  ASYNC: 'async',
  /** If the field value is an Array, this error type would be returned if an _item_ of the array is invalid */
  ARRAY_ITEM: 'arrayItem',
};

export const STORYBOOK_SECTION = 'Form lib';
