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

import { ReactNode, ChangeEvent, FormEvent, MouseEvent } from 'react';
import { Subject, Subscription } from './lib';

// This type will convert all optional property to required ones
// Comes from https://github.com/microsoft/TypeScript/issues/15012#issuecomment-365453623
type Required<T> = T extends FormData ? { [P in keyof T]-?: NonNullable<T[P]> } : T;

export interface FormHook<T extends FormData = FormData> {
  readonly isSubmitted: boolean;
  readonly isSubmitting: boolean;
  readonly isValid: boolean | undefined;
  readonly id: string;
  submit: (e?: FormEvent<HTMLFormElement> | MouseEvent) => Promise<{ data: T; isValid: boolean }>;
  subscribe: (handler: OnUpdateHandler<T>) => Subscription;
  setFieldValue: (fieldName: string, value: FieldValue) => void;
  setFieldErrors: (fieldName: string, errors: ValidationError[]) => void;
  getFields: () => FieldsMap;
  getFormData: (options?: { unflatten?: boolean }) => T;
  getFieldDefaultValue: (fieldName: string) => unknown;
  /* Returns a list of all errors in the form */
  getErrors: () => string[];
  reset: (options?: { resetValues?: boolean; defaultValue?: Partial<T> }) => void;
  readonly __options: Required<FormOptions>;
  __getFormData$: () => Subject<T>;
  __addField: (field: FieldHook) => void;
  __removeField: (fieldNames: string | string[]) => void;
  __validateFields: (
    fieldNames: string[]
  ) => Promise<{ areFieldsValid: boolean; isFormValid: boolean | undefined }>;
  __updateFormDataAt: (field: string, value: unknown) => T;
  __updateDefaultValueAt: (field: string, value: unknown) => void;
  __readFieldConfigFromSchema: (fieldName: string) => FieldConfig;
}

export interface FormSchema<T extends FormData = FormData> {
  [key: string]: FormSchemaEntry<T>;
}

type FormSchemaEntry<T extends FormData> =
  | FieldConfig<T>
  | Array<FieldConfig<T>>
  | { [key: string]: FieldConfig<T> | Array<FieldConfig<T>> | FormSchemaEntry<T> };

export interface FormConfig<T extends FormData = FormData> {
  onSubmit?: FormSubmitHandler<T>;
  schema?: FormSchema<T>;
  defaultValue?: Partial<T>;
  serializer?: SerializerFunc<T>;
  deserializer?: SerializerFunc;
  options?: FormOptions;
  id?: string;
}

export interface OnFormUpdateArg<T extends FormData> {
  data: {
    raw: { [key: string]: any };
    format: () => T;
  };
  validate: () => Promise<boolean>;
  isValid?: boolean;
}

export type OnUpdateHandler<T extends FormData = FormData> = (arg: OnFormUpdateArg<T>) => void;

export interface FormOptions {
  errorDisplayDelay?: number;
  /**
   * Remove empty string field ("") from form data
   */
  stripEmptyFields?: boolean;
}

export interface FieldHook<T = unknown> {
  readonly path: string;
  readonly label?: string;
  readonly labelAppend?: string | ReactNode;
  readonly helpText?: string | ReactNode;
  readonly type: string;
  readonly value: T;
  readonly errors: ValidationError[];
  readonly isValid: boolean;
  readonly isPristine: boolean;
  readonly isValidating: boolean;
  readonly isValidated: boolean;
  readonly isChangingValue: boolean;
  getErrorsMessages: (args?: {
    validationType?: 'field' | string;
    errorCode?: string;
  }) => string | null;
  onChange: (event: ChangeEvent<{ name?: string; value: string; checked?: boolean }>) => void;
  setValue: (value: T) => T;
  setErrors: (errors: ValidationError[]) => void;
  clearErrors: (type?: string | string[]) => void;
  validate: (validateData?: {
    formData?: any;
    value?: unknown;
    validationType?: string;
  }) => FieldValidateResponse | Promise<FieldValidateResponse>;
  reset: (options?: { resetValue?: boolean; defaultValue?: T }) => unknown | undefined;
  __serializeValue: (rawValue?: unknown) => unknown;
}

export interface FieldConfig<T extends FormData = any, ValueType = unknown> {
  readonly path?: string;
  readonly label?: string;
  readonly labelAppend?: string | ReactNode;
  readonly helpText?: string | ReactNode;
  readonly type?: HTMLInputElement['type'];
  readonly defaultValue?: ValueType;
  readonly validations?: Array<ValidationConfig<T>>;
  readonly formatters?: FormatterFunc[];
  readonly deserializer?: SerializerFunc;
  readonly serializer?: SerializerFunc;
  readonly fieldsToValidateOnChange?: string[];
  readonly errorDisplayDelay?: number;
}

export interface FieldsMap {
  [key: string]: FieldHook;
}

export type FormSubmitHandler<T extends FormData = FormData> = (
  formData: T,
  isValid: boolean
) => Promise<void>;

export interface ValidationError<T = string> {
  message: string;
  code?: T;
  validationType?: string;
  [key: string]: any;
}

export interface ValidationFuncArg<T extends FormData, V = unknown> {
  path: string;
  value: V;
  form: {
    getFormData: FormHook<T>['getFormData'];
    getFields: FormHook<T>['getFields'];
  };
  formData: T;
  errors: readonly ValidationError[];
}

export type ValidationFunc<T extends FormData = any, E = string> = (
  data: ValidationFuncArg<T>
) => ValidationError<E> | void | undefined | Promise<ValidationError<E> | void | undefined>;

export interface FieldValidateResponse {
  isValid: boolean;
  errors: ValidationError[];
}

export type SerializerFunc<O = unknown, I = any> = (value: I) => O;

export interface FormData {
  [key: string]: any;
}

type FormatterFunc = (value: any, formData: FormData) => unknown;

// We set it as unknown as a form field can be any of any type
// string | number | boolean | string[] ...
type FieldValue = unknown;

export interface ValidationConfig<T extends FormData = any> {
  validator: ValidationFunc<T>;
  type?: string;
  exitOnFail?: boolean;
}
