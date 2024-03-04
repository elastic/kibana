/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ReactNode, ChangeEvent, FormEvent, MouseEvent } from 'react';
import { Subject, Subscription } from './lib';

// This type will convert all optional property to required ones
// Comes from https://github.com/microsoft/TypeScript/issues/15012#issuecomment-365453623
type Required<T> = T extends FormData ? { [P in keyof T]-?: NonNullable<T[P]> } : T;

export interface FormHook<T extends FormData = FormData, I extends FormData = T> {
  /**  Flag that indicates if the form has been submitted at least once. It is set to `true` when we call `submit()`. */
  readonly isSubmitted: boolean;
  /** Flag that indicates if the form is being submitted. */
  readonly isSubmitting: boolean;
  /** Flag that indicates if the form is valid. If `undefined` then the form validation has not been checked yet. */
  readonly isValid: boolean | undefined;
  /** The form id. If none was provided, "default" will be returned. */
  readonly id: string;
  /**
   * This handler submits the form and returns its data and validity. If the form is not valid, the data will be `null`
   * as only valid data is passed through the `serializer(s)` before being returned.
   */
  submit: (e?: FormEvent<HTMLFormElement> | MouseEvent) => Promise<{ data: T; isValid: boolean }>;
  /** Use this handler to get the validity of the form. */
  validate: () => Promise<boolean>;
  subscribe: (handler: OnUpdateHandler<T, I>) => Subscription;
  /** Sets a field value imperatively. */
  setFieldValue: (fieldName: string, value: FieldValue) => void;
  /** Sets a field errors imperatively. */
  setFieldErrors: (fieldName: string, errors: ValidationError[]) => void;
  /** Access the fields on the form. */
  getFields: () => FieldsMap;
  /** Access the defaultValue for a specific field */
  getFieldDefaultValue: <FieldType = unknown>(path: string) => FieldType | undefined;
  /** Return the form data. */
  getFormData: () => T;
  /* Returns an array with of all errors in the form. */
  getErrors: () => string[];
  /**
   * Update multiple field values at once. You don't need to provide all the form
   * fields, **partial** update is supported. This method is mainly useful to update an array
   * of object fields.
   *
   * @example
   * ```js
   * // Update an array of fields
   * form.updateFieldValues({ myArray: [{ foo: 'bar', baz: true }, { foo2: 'bar2', baz: false }] })
   *
   * // or simply multiple fields at once
   * form.updateFieldValues({ foo: 'bar', baz: false })
   * ```
   */
  updateFieldValues: (
    updatedFormData: Partial<T> & FormData,
    options?: {
      /**
       * Flag to indicate if the deserializer(s) are run against the provided form data.
       * @default true
       */
      runDeserializer?: boolean;
    }
  ) => void;
  /**
   * Reset the form states to their initial value and optionally
   * all the fields to their initial values.
   */
  reset: (options?: {
    /**
     * Flag to indicate if the fields values are reset or only the states
     * (isSubmitted, isPristine, isValidated...).
     * @default true
     */
    resetValues?: boolean;
    /**
     * The defaultValue object of the form to reset to (if resetValues is "true").
     * If not specified, the initial "defaultValue" passed when initiating the form will be used.
     * Pass an empty object (`{}`) to reset to a blank form.
     */
    defaultValue?: Partial<T>;
  }) => void;
  validateFields: (
    fieldNames: string[],
    /** Run only blocking validations */
    onlyBlocking?: boolean
  ) => Promise<{ areFieldsValid: boolean; isFormValid: boolean | undefined }>;
  readonly __options: Required<FormOptions>;
  __getFormData$: () => Subject<FormData>;
  __addField: (field: FieldHook<any>) => void;
  __removeField: (fieldNames: string | string[]) => void;
  __updateFormDataAt: (field: string, value: unknown) => void;
  __updateDefaultValueAt: (field: string, value: unknown) => void;
  __readFieldConfigFromSchema: <
    FieldType = unknown,
    FormType = FormData,
    InternalFieldType = FieldType
  >(
    fieldPath: string
  ) => FieldConfig<FieldType, FormType, InternalFieldType> | undefined;
  __getFormDefaultValue: () => I | undefined;
  __getFieldsRemoved: () => FieldsMap;
}

export type FormSchema<T extends FormData = FormData> = {
  [K in keyof T]?: FieldConfig<T[K], T, any> | FormSchema<T[K]>;
};

export interface FormConfig<T extends FormData = FormData, I extends FormData = T> {
  onSubmit?: FormSubmitHandler<T>;
  schema?: FormSchema<I>;
  defaultValue?: Partial<T>;
  serializer?: SerializerFunc<T, I>;
  deserializer?: SerializerFunc<I, T>;
  options?: FormOptions;
  id?: string;
}

export interface OnFormUpdateArg<T extends FormData, I extends FormData = T> {
  data: {
    internal: I;
    format: () => T;
  };
  validate: () => Promise<boolean>;
  isValid?: boolean;
}

export type OnUpdateHandler<T extends FormData = FormData, I extends FormData = T> = (
  arg: OnFormUpdateArg<T, I>
) => void;

export interface FormOptions {
  valueChangeDebounceTime?: number;
  /**
   * Remove empty string field ("") from form data
   */
  stripEmptyFields?: boolean;
}

export interface FieldHook<T = unknown, I = T> {
  readonly path: string;
  readonly label?: string;
  readonly labelAppend?: string | ReactNode;
  readonly helpText?: string | ReactNode;
  readonly type: string;
  readonly value: I;
  readonly errors: ValidationError[];
  readonly isValid: boolean;
  readonly isPristine: boolean;
  readonly isDirty: boolean;
  readonly isModified: boolean;
  readonly isValidating: boolean;
  readonly isValidated: boolean;
  readonly isChangingValue: boolean;
  /**
   * Validations declared on the field can have a specific "type" added (if not specified
   * the `field` type is set by default). When we validate a field, all errors are added into
   * a common "errors" array.
   * Use this handler to retrieve error messages for a specific error code or validation type.
   */
  getErrorsMessages: (args?: {
    /** The errorCode to return error messages from. It takes precedence over "validationType" */
    errorCode?: string;
    /** The validation type to return error messages from */
    validationType?: 'field' | string;
  }) => string | null;
  /**
   * Form <input /> "onChange" event handler
   *
   * @param event Form input change event
   */
  onChange: (event: ChangeEvent<{ name?: string; value: string; checked?: boolean }>) => void;
  /**
   * Handler to change the field value
   *
   * @param value The new value to assign to the field. If a callback is provided, the new value
   * must be returned synchronously.
   */
  setValue: (value: I | ((prevValue: I) => I)) => void;
  setErrors: (errors: ValidationError[]) => void;
  /**
   * Clear field errors. One of multiple validation types can be specified.
   * If no type is specified the default `field` type will be cleared.
   */
  clearErrors: (type?: string | string[]) => void;
  /**
   * Validate a form field, running all its validations.
   * If a validationType is provided then only that validation will be executed,
   * skipping the other type of validation that might exist.
   */
  validate: (validateData?: {
    formData?: any;
    value?: I;
    validationType?: string;
    onlyBlocking?: boolean;
  }) => FieldValidateResponse | Promise<FieldValidateResponse>;
  reset: (options?: { resetValue?: boolean; defaultValue?: T }) => unknown | undefined;
  /**
   * (Used internally). Flag to indicate if the field value will be included in the form data outputted
   * when submitting the form or calling `form.getFormData()`.
   */
  __isIncludedInOutput: boolean;
  __serializeValue: (internalValue?: I) => T;
}

export interface FieldConfig<T = unknown, FormType extends FormData = FormData, I = T> {
  readonly label?: string;
  readonly labelAppend?: string | ReactNode;
  readonly helpText?: string | ReactNode;
  readonly type?: string;
  readonly defaultValue?: T;
  readonly validations?: Array<ValidationConfig<FormType, string, I>>;
  readonly formatters?: Array<FormatterFunc<I>>;
  readonly deserializer?: SerializerFunc<I, T>;
  readonly serializer?: SerializerFunc<T, I>;
  readonly fieldsToValidateOnChange?: string[];
  readonly valueChangeDebounceTime?: number;
}

export interface FieldValidationData {
  validationData?: unknown;
  validationDataProvider?: () => Promise<unknown>;
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
  __isBlocking__?: boolean;
  [key: string]: any;
}

export interface ValidationFuncArg<I extends FormData, V = unknown> {
  path: string;
  value: V;
  form: {
    getFormData: FormHook<FormData, I>['getFormData'];
    getFields: FormHook<FormData, I>['getFields'];
  };
  formData: I;
  errors: readonly ValidationError[];
  customData: {
    /** Async handler that will resolve whenever a value is sent to the `validationData$` Observable */
    provider: () => Promise<unknown>;
    value: unknown;
  };
}

export type ValidationFunc<
  I extends FormData = FormData,
  E extends string = string,
  V = unknown
> = (
  data: ValidationFuncArg<I, V>
) => ValidationError<E> | void | undefined | ValidationCancelablePromise<E>;

export type ValidationResponsePromise<E extends string = string> = Promise<
  ValidationError<E> | void | undefined
>;

export type ValidationCancelablePromise<E extends string = string> =
  ValidationResponsePromise<E> & { cancel?(): void };

export interface FieldValidateResponse {
  isValid: boolean;
  errors: ValidationError[];
}

export type SerializerFunc<O = unknown, I = any> = (value: I) => O;

export interface FormData {
  [key: string]: any;
}

type FormatterFunc<I = unknown> = (value: any, formData: FormData) => I;

// We set it as unknown as a form field can be any of any type
// string | number | boolean | string[] ...
type FieldValue = unknown;

export interface ValidationConfig<
  I extends FormData = FormData,
  E extends string = string,
  V = unknown
> {
  validator: ValidationFunc<I, E, V>;
  type?: string;
  /**
   * By default all validation are blockers, which means that if they fail, the field is invalid.
   * In some cases, like when trying to add an item to the ComboBox, if the item is not valid we want
   * to show a validation error. But this validation is **not** blocking. Simply, the item has not been added.
   */
  isBlocking?: boolean;
  exitOnFail?: boolean;
  /**
   * Flag to indicate if the validation is asynchronous. If not specified the lib will
   * first try to run all the validations synchronously and if it detects a Promise it
   * will run the validations a second time asynchronously.
   * This means that HTTP request will be called twice which is not ideal. It is then
   * recommended to set the "isAsync" flag to `true` to all asynchronous validations.
   */
  isAsync?: boolean;
}
