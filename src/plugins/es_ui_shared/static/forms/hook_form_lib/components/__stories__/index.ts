/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Validation } from './form_validation';
import { DeSerializer } from './form_de_serializer';
import { DefaultValue } from './form_default_value';
import { IsModified } from './form_is_modified';

import { submitForm, FormWrapper } from './form_utils';

import { Basic as UseArrayBasic } from './use_array_basic';
import { Complex as UseArrayComplex } from './use_array_complex';

export const formStories = {
  Validation,
  DeSerializer,
  DefaultValue,
  IsModified,
};

export const useArrayStories = {
  UseArrayBasic,
  UseArrayComplex,
};

export const helpers = {
  submitForm,
};

export { FormWrapper };
