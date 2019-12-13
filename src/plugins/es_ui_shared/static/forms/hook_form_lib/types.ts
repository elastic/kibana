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

import { ReactNode, ChangeEvent, FormEvent, MouseEvent, MutableRefObject } from 'react';
import { Subject } from './lib';

// This type will convert all optional property to required ones
// Comes from https://github.com/microsoft/TypeScript/issues/15012#issuecomment-365453623
type Required<T> = T extends object ? { [P in keyof T]-?: NonNullable<T[P]> } : T;

export interface FormHook<T extends object = FormData> {
  readonly isSubmitted: boolean;
  readonly isSubmitting: boolean;
  readonly isValid: boolean;
  submit: (e?: FormEvent<HTMLFormElement> | MouseEvent) => Promise<{ data: T; isValid: boolean }>;
  setFieldValue: (fieldName: string, value: FieldValue) => void;
  setFieldErrors: (fieldName: string, errors: ValidationError[]) => void;
  getFields: () => FieldsMap;
  getFormData: (options?: { unflatten?: boolean }) => T;
  getFieldDefaultValue: (fieldName: string) => unknown;
  readonly __options: Required<FormOptions>;
  readonly __formData$: MutableRefObject<Subject<T>>;
  __addField: (field: FieldHook) => void;
  __removeField: (fieldNames: string | string[]) => void;
  __validateFields: (fieldNames?: string[]) => Promise<boolean>;
  __updateFormDataAt: (field: string, value: unknown) => T;
  __readFieldConfigFromSchema: (fieldName: string) => FieldConfig;
}

export interface FormSchema<T extends object = FormData> {
  [key: string]: FormSchemaEntry<T>;
}
type FormSchemaEntry<T extends object> =
  | FieldConfig<T>
  | Array<FieldConfig<T>>
  | { [key: string]: FieldConfig<T> | Array<FieldConfig<T>> | FormSchemaEntry<T> };

export interface FormConfig<T extends object = FormData> {
  onSubmit?: (data: T, isFormValid: boolean) => void;
  schema?: FormSchema<T>;
  defaultValue?: Partial<T>;
  serializer?: SerializerFunc<T>;
  deserializer?: SerializerFunc;
  options?: FormOptions;
}

export interface FormOptions {
  errorDisplayDelay?: number;
  /**
   * Remove empty string field ("") from form data
   */
  stripEmptyFields?: boolean;
}

export interface FieldHook {
  readonly path: string;
  readonly label?: string;
  readonly labelAppend?: string | ReactNode;
  readonly helpText?: string | ReactNode;
  readonly type: string;
  readonly value: unknown;
  readonly errors: ValidationError[];
  readonly isPristine: boolean;
  readonly isValidating: boolean;
  readonly isChangingValue: boolean;
  readonly form: FormHook<any>;
  getErrorsMessages: (args?: {
    validationType?: 'field' | string;
    errorCode?: string;
  }) => string | null;
  onChange: (event: ChangeEvent<{ name?: string; value: string; checked?: boolean }>) => void;
  setValue: (value: FieldValue) => void;
  setErrors: (errors: ValidationError[]) => void;
  clearErrors: (type?: string | string[]) => void;
  validate: (validateData?: {
    formData?: any;
    value?: unknown;
    validationType?: string;
  }) => FieldValidateResponse | Promise<FieldValidateResponse>;
  __serializeOutput: (rawValue?: unknown) => unknown;
}

export interface FieldConfig<T extends object = any> {
  readonly path?: string;
  readonly label?: string;
  readonly labelAppend?: string | ReactNode;
  readonly helpText?: string | ReactNode;
  readonly type?: HTMLInputElement['type'];
  readonly defaultValue?: unknown;
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

export type FormSubmitHandler<T> = (formData: T, isValid: boolean) => Promise<void>;

export interface ValidationError<T = string> {
  message: string;
  code?: T;
  validationType?: string;
  [key: string]: any;
}

export type ValidationFunc<T extends object = any, E = string> = (data: {
  path: string;
  value: unknown;
  form: FormHook<T>;
  formData: T;
  errors: readonly ValidationError[];
}) => ValidationError<E> | void | undefined | Promise<ValidationError<E> | void | undefined>;

export interface FieldValidateResponse {
  isValid: boolean;
  errors: ValidationError[];
}

export type SerializerFunc<T = unknown> = (value: any) => T;

export interface FormData {
  [key: string]: any;
}

type FormatterFunc = (value: any) => unknown;

// We set it as unknown as a form field can be any of any type
// string | number | boolean | string[] ...
type FieldValue = unknown;

export interface ValidationConfig<T extends object = any> {
  validator: ValidationFunc<T>;
  type?: string;
  exitOnFail?: boolean;
}
