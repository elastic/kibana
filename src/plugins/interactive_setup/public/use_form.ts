/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { set } from '@elastic/safer-lodash-set';
import { cloneDeep, cloneDeepWith, get } from 'lodash';
import type { ChangeEventHandler, FocusEventHandler, ReactEventHandler } from 'react';
import { useRef } from 'react';
import useAsyncFn from 'react-use/lib/useAsyncFn';

export type FormReturnTuple<Values, Result> = [FormState<Values, Result>, FormProps];

export interface FormProps {
  onSubmit: ReactEventHandler;
  onChange: ChangeEventHandler<HTMLFormElement & HTMLInputElement>;
  onBlur: FocusEventHandler<HTMLFormElement & HTMLInputElement>;
}

export interface FormOptions<Values, Result> {
  onSubmit: SubmitCallback<Values, Result>;
  validate: ValidateCallback<Values>;
  defaultValues: Values;
}

/**
 * Returns state and {@link HTMLFormElement} event handlers useful for creating
 * forms with inline validation.
 *
 * @see {@link useFormState} if you don't want to use {@link HTMLFormElement}.
 *
 * @example
 * ```typescript
 * const [form, eventHandlers] = useForm({
 *   onSubmit: (values) => apiClient.create(values),
 *   validate: (values) => !values.email ? { email: 'Required' } : {}
 * });
 *
 * <EuiForm component="form" {...eventHandlers}>
 *   <EuiFieldText name="email" isInvalid={form.touched.email && form.errors.email} />
 *   <EuiButton type="submit">Submit</EuiButton>
 * <EuiForm>
 * ```
 */
export function useForm<Values extends FormValues, Result>(
  options: FormOptions<Values, Result>
): FormReturnTuple<Values, Result> {
  const form = useFormState(options);

  const eventHandlers: FormProps = {
    onSubmit: (event) => {
      event.preventDefault();
      form.submit();
    },
    onChange: (event) => {
      const { name, type, checked, value } = event.target;
      if (name) {
        form.setValue(name, type === 'checkbox' ? checked : value);
      }
    },
    onBlur: (event) => {
      const { name } = event.target;
      if (name) {
        form.setTouched(event.target.name);
      }
    },
  };

  return [form, eventHandlers];
}

export type FormValues = Record<string, any>;
export type SubmitCallback<Values, Result> = (values: Values) => Promise<Result>;
export type ValidateCallback<Values> = (
  values: Values
) => ValidationErrors<Values> | Promise<ValidationErrors<Values>>;
export type ValidationErrors<Values> = DeepMap<Values, string>;
export type TouchedFields<Values> = DeepMap<Values, boolean>;

export interface FormState<Values, Result> {
  setValue(name: string, value: any, revalidate?: boolean): Promise<void>;
  setError(name: string, message: string): void;
  setTouched(name: string, touched?: boolean, revalidate?: boolean): Promise<void>;
  reset(values: Values): void;
  submit(): Promise<Result | undefined>;
  validate(): Promise<ValidationErrors<Values>>;
  values: Values;
  errors: ValidationErrors<Values>;
  touched: TouchedFields<Values>;
  isValidating: boolean;
  isSubmitting: boolean;
  submitError: Error | undefined;
  isInvalid: boolean;
  isSubmitted: boolean;
}

/**
 * Returns state useful for creating forms with inline validation.
 *
 * @example
 * ```typescript
 * const form = useFormState({
 *   onSubmit: (values) => apiClient.create(values),
 *   validate: (values) => !values.toggle ? { toggle: 'Required' } : {}
 * });
 *
 * <EuiSwitch
 *   checked={form.values.toggle}
 *   onChange={(e) => form.setValue('toggle', e.target.checked)}
 *   onBlur={() => form.setTouched('toggle')}
 *   isInvalid={!!form.errors.toggle}
 * />
 * <EuiButton onClick={form.submit}>
 *   Submit
 * </EuiButton>
 * ```
 */
export function useFormState<Values extends FormValues, Result>({
  onSubmit,
  validate,
  defaultValues,
}: FormOptions<Values, Result>): FormState<Values, Result> {
  const valuesRef = useRef<Values>(defaultValues);
  const errorsRef = useRef<ValidationErrors<Values>>({});
  const touchedRef = useRef<TouchedFields<Values>>({});
  const submitCountRef = useRef(0);

  const [validationState, validateForm] = useAsyncFn(async (formValues: Values) => {
    const nextErrors = await validate(formValues);
    errorsRef.current = nextErrors;
    if (Object.keys(nextErrors).length === 0) {
      submitCountRef.current = 0;
    }
    return nextErrors;
  }, []);

  const [submitState, submitForm] = useAsyncFn(async (formValues: Values) => {
    const nextErrors = await validateForm(formValues);
    touchedRef.current = mapDeep(formValues, true);
    submitCountRef.current += 1;
    if (Object.keys(nextErrors).length === 0) {
      return onSubmit(formValues);
    }
  }, []);

  return {
    setValue: async (name, value, revalidate = true) => {
      const nextValues = setDeep(valuesRef.current, name, value);
      valuesRef.current = nextValues;
      if (revalidate) {
        await validateForm(nextValues);
      }
    },
    setTouched: async (name, touched = true, revalidate = true) => {
      touchedRef.current = setDeep(touchedRef.current, name, touched);
      if (revalidate) {
        await validateForm(valuesRef.current);
      }
    },
    setError: (name, message) => {
      errorsRef.current = setDeep(errorsRef.current, name, message);
      touchedRef.current = setDeep(touchedRef.current, name, true);
    },
    reset: (nextValues) => {
      valuesRef.current = nextValues;
      errorsRef.current = {};
      touchedRef.current = {};
      submitCountRef.current = 0;
    },
    submit: () => submitForm(valuesRef.current),
    validate: () => validateForm(valuesRef.current),
    values: valuesRef.current,
    errors: errorsRef.current,
    touched: touchedRef.current,
    isValidating: validationState.loading,
    isSubmitting: submitState.loading,
    submitError: submitState.error,
    isInvalid: Object.keys(errorsRef.current).length > 0,
    isSubmitted: submitCountRef.current > 0,
  };
}

type DeepMap<T, TValue> = {
  [K in keyof T]?: T[K] extends any[]
    ? T[K][number] extends object
      ? Array<DeepMap<T[K][number], TValue>>
      : TValue
    : T[K] extends object
    ? DeepMap<T[K], TValue>
    : TValue;
};

function mapDeep<T, V>(values: T, value: V): DeepMap<T, V> {
  return cloneDeepWith(values, (v) => {
    if (typeof v !== 'object' && v !== null) {
      return value;
    }
  });
}

function setDeep<T extends object, V>(values: T, name: string, value: V): T {
  if (get(values, name) !== value) {
    return set(cloneDeep(values), name, value);
  }
  return values;
}
