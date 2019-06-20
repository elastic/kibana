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

import { ChangeEvent, FormEvent } from 'react';
export interface Form<T = FormData> {
  readonly isSubmitted: boolean;
  readonly isSubmitting: boolean;
  readonly isValid: boolean;
  readonly options: FormOptions;
  onSubmit: (e: FormEvent<HTMLFormElement>) => void;
  addField: (field: Field) => void;
  removeField: (fieldNames: string | string[]) => void;
  removeFieldsStartingWith: (pattern: string) => void;
  validateFields: (fieldNames?: string[]) => Promise<boolean>;
  getFormData: (options?: { unflatten?: boolean }) => T | Record<string, unknown>;
  getFields: () => FieldsMap;
  setFieldValue: (fieldName: string, value: FieldValue) => void;
  setFieldErrors: (fieldName: string, errors: ValidationError[]) => void;
  getDefaultValueField: (fieldName: string) => unknown;
  readFieldConfigFromSchema: (fieldName: string) => FieldConfig;
}

export interface FormSchema<T = FormData> {
  [key: string]: FormSchemaEntry<T>;
}
type FormSchemaEntry<T> =
  | FieldConfig<T>
  | Array<FieldConfig<T>>
  | { [key: string]: FieldConfig<T> | Array<FieldConfig<T>> | FormSchemaEntry<T> };

export interface FormConfig<T = FormData> {
  onSubmit: (data: T, isFormValid: boolean) => void;
  schema?: FormSchema<T>;
  defaultValues?: Partial<T>;
  options?: FormOptions;
}

export interface FormOptions {
  errorDisplayDelay: number;
  /**
   * Remove empty string field ("") from form data
   */
  stripEmptyFields: boolean;
}

export interface Field {
  readonly path: string;
  readonly label?: string;
  readonly helpText?: string;
  readonly type: string;
  readonly value: unknown;
  readonly errors: ValidationError[];
  readonly isPristine: boolean;
  readonly isValidating: boolean;
  readonly isUpdating: boolean;
  readonly form: Form;
  onChange: (e: ChangeEvent<{ name?: string; value: string; checked?: boolean }>) => void;
  validate: (formData: any) => Promise<boolean>;
  setErrors: (errors: ValidationError[]) => void;
  setValue: (value: FieldValue) => void;
}

export interface FieldConfig<T = FormData> {
  readonly path?: string;
  readonly label?: string;
  readonly helpText?: string;
  readonly type?: HTMLInputElement['type'];
  readonly defaultValue?: unknown;
  readonly validations?: Array<ValidationConfig<T>>;
  readonly formatters?: FormatterFunc[];
  readonly fieldsToValidateOnChange?: string[];
  readonly isValidationAsync?: boolean;
}

export interface FieldsMap {
  [key: string]: Field;
}

export type FormSubmitHandler<T> = (formData: T, isValid: boolean) => Promise<void>;

export interface ValidationError {
  code: string;
  message: string | ((error: ValidationError) => string);
  alwaysVisible?: boolean;
  [key: string]: any;
}

export type ValidationFunc<T = any> = (
  data: {
    path: string;
    value: string;
    formData: T;
    errors: ReadonlyArray<ValidationError>;
  }
) => ValidationError | void | undefined | Promise<ValidationError | void | undefined>;

type FormData = Record<string, string>;

type FormatterFunc = (value: any) => unknown;

// We set it as unknown as a form field can be any of any type
// string | number | boolean | string[] ...
type FieldValue = unknown;

export interface ValidationConfig<T = any> {
  validator: ValidationFunc<T>;
  message?: string | ((error: ValidationError) => string);
  exitOnFail?: boolean;
}
