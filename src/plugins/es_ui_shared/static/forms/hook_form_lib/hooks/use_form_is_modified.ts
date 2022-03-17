/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { useMemo, useState } from 'react';
import { get } from 'lodash';

import { FieldHook, FormHook } from '../types';
import { useFormContext } from '../form_context';
import { useFormData } from './use_form_data';

interface Options {
  form?: FormHook<any>;
  /**
   * List of field paths to discard when checking if a field has been modified.
   * Useful when we add internal fields (e.g. toggles) to the form that should not
   * have an impact on the "isModified" state.
   */
  discard?: string[];
}

/**
 * Hook to detect if any of the form fields have been modified by the user.
 * If a field is modified and then the value is changed back to the initial value
 * the form **won't be marked as modified**.
 * This is useful to detect if a form has changed and we need to display a confirm modal
 * to the user before they navigate away and lose their changes.
 *
 * @param options - Optional options object
 * @returns flag to indicate if the form has been modified
 */
export const useFormIsModified = ({
  form: formFromOptions,
  discard: fieldPathsToDiscard = [],
}: Options = {}): boolean => {
  const [isFormModified, setIsFormModified] = useState(false);

  // Hook calls can not be conditional we first try to access the form through context
  let form = useFormContext({ throwIfNotFound: false });

  if (formFromOptions) {
    form = formFromOptions;
  }

  if (!form) {
    throw new Error(
      `useFormIsModified() used outside the form context and no form was provided in the options.`
    );
  }

  const { getFields, __getFieldsRemoved, __getFormDefaultValue } = form;

  const discardArrayToString = JSON.stringify(fieldPathsToDiscard);

  // Create a map of the fields to discard to optimize look up
  const fieldsToDiscard = useMemo(() => {
    if (fieldPathsToDiscard.length === 0) {
      return;
    }

    return fieldPathsToDiscard.reduce(
      (acc, path) => ({ ...acc, [path]: true }),
      {} as { [key: string]: {} }
    );

    // discardArrayToString === discard, we don't want to add it to the dependencies so
    // the consumer does not need to memoize the "discard" array they provide.
  }, [discardArrayToString]); // eslint-disable-line react-hooks/exhaustive-deps

  // We listen to all the form data change to trigger a re-render
  // and update our derived "isModified" state
  useFormData({ form });

  const isFieldIncluded = fieldsToDiscard
    ? ([path]: [string, FieldHook]) => fieldsToDiscard[path] !== true
    : () => true;

  // 1. Check if any field has been modified
  let isModified = Object.entries(getFields())
    .filter(isFieldIncluded)
    .some(([_, field]) => field.isModified);

  if (!isModified) {
    // 2. Check if any field has been removed.
    // If somme field has been removed **and** they were originaly present on the
    // form "defaultValue" then the form has been modified.
    const formDefaultValue = __getFormDefaultValue();
    const fieldOnFormDefaultValue = (path: string) => Boolean(get(formDefaultValue, path));

    const fieldsRemovedFromDOM: string[] = fieldsToDiscard
      ? Object.keys(__getFieldsRemoved())
        .filter((path) => fieldsToDiscard[path] !== true)
        .filter(fieldOnFormDefaultValue)
      : Object.keys(__getFieldsRemoved()).filter(fieldOnFormDefaultValue);

    isModified = fieldsRemovedFromDOM.length > 0;
  }

  if (isModified && !isFormModified) {
    setIsFormModified(true);
  } else if (!isModified && isFormModified) {
    setIsFormModified(false);
  }

  return isFormModified;
};
