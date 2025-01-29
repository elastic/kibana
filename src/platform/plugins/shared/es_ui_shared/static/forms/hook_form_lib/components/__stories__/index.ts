/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Validation } from './form_validation';
import { DeSerializer } from './form_de_serializer';
import { DefaultValue } from './form_default_value';
import { IsModified } from './form_is_modified';
import { GlobalFields } from './form_global_fields';

import { submitForm, FormWrapper } from './form_utils';

import { FieldTypes as UseFieldFieldTypes } from './use_field_field_types';
import { ChangeListeners as UseFieldChangeListeners } from './use_field_change_listeners';

import { Basic as UseArrayBasic } from './use_array_basic';
import { Reorder as UseArrayReorder } from './use_array_reorder';
import { Complex as UseArrayComplex } from './use_array_complex';
import { DynamicData as UseArrayDynamicData } from './use_array_dynamic_data';

import { Basic as UseMultiFieldBasic } from './use_multi_field_basic';

export const formStories = {
  Validation,
  DeSerializer,
  DefaultValue,
  IsModified,
  GlobalFields,
};

export const useFieldStories = {
  UseFieldFieldTypes,
  UseFieldChangeListeners,
};

export const useArrayStories = {
  UseArrayBasic,
  UseArrayReorder,
  UseArrayComplex,
  UseArrayDynamicData,
};

export const useMultiFieldStories = {
  UseMultiFieldBasic,
};

export const helpers = {
  submitForm,
};

export { FormWrapper };
