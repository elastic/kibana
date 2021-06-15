/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { FormHook } from '../types';
import { useFormContext } from '../form_context';
import { useFormData } from './use_form_data';

interface Options {
  form?: FormHook<any>;
}

/**
 * Hook to detect if any of the form fields have been modified by the user.
 * If a field is modified and then the value is changed back to the initial value
 * the form **won't be marked as modified**.
 * This is useful to detect if a form has changed and we need to display a confirm modal
 * to the user before he navigates away and loses his changes.
 *
 * @param options - Optional options object
 * @returns flag to indicate if the form has been modified
 */
export const useFormIsModified = ({ form: formFromOptions }: Options = {}): boolean => {
  // As hook calls can not be conditional we first try to access the form through context
  let form = useFormContext({ throwIfNotFound: false });

  if (formFromOptions) {
    form = formFromOptions;
  }

  if (!form) {
    throw new Error(
      `useFormIsModified() used outside the form context and no form was provided in the options.`
    );
  }

  const { getFields } = form;

  // We listen to all the form data change to trigger re-render...
  useFormData({ form });

  // ...and update our derived "isModified" state
  const isModified = Object.values(getFields()).some((field) => field.isModified);

  return isModified;
};
