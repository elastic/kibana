/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

// We don't export the "useField()" hook as it is created internally.
// Consumers must use the <UseField />, <UseArray /> or <UseMultiFields />
// components to create fields.
export { useForm, useFormData, useFormIsModified, useBehaviorSubject } from './hooks';

export { getFieldValidityAndErrorMessage } from './helpers';

export { FormProvider, useFormContext } from './form_context';

export {
  Form,
  getUseField,
  UseArray,
  UseField,
  UseMultiFields,
  FormDataProvider,
} from './components';

export type { ArrayItem, FormArrayField, UseFieldProps } from './components';

export { FIELD_TYPES, VALIDATION_TYPES } from './constants';

export type {
  FieldConfig,
  FieldHook,
  FieldsMap,
  FieldValidateResponse,
  FormConfig,
  FormData,
  FormHook,
  FormOptions,
  FormSchema,
  FormSubmitHandler,
  OnFormUpdateArg,
  OnUpdateHandler,
  SerializerFunc,
  ValidationCancelablePromise,
  ValidationConfig,
  ValidationError,
  ValidationFunc,
  ValidationFuncArg,
  ValidationResponsePromise,
} from './types';
