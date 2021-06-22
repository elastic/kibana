/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { useMemo } from 'react';
import { get } from 'lodash';

import { FieldHook, FormHook } from '../types';
import { useFormContext } from '../form_context';
import { useFormData } from './use_form_data';

interface Options {
  form?: FormHook<any>;
  /** List of field paths to discard when checking if a field has been modified */
  discard?: string[];
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
export const useFormIsModified = ({
  form: formFromOptions,
  discard = [],
}: Options = {}): boolean => {
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

  const { getFields, __getFieldsRemoved, __getFormDefaultValue } = form;

  const discardToString = JSON.stringify(discard);

  // Create a map of the fields to discard to optimize look up
  const fieldsToDiscard = useMemo(() => {
    if (discard.length === 0) {
      return;
    }

    return discard.reduce((acc, path) => ({ ...acc, [path]: {} }), {} as { [key: string]: {} });

    // discardToString === discard, we don't want to add it to the deps so we
    // the coansumer does not need to memoize the array he provides.
  }, [discardToString]); // eslint-disable-line react-hooks/exhaustive-deps

  // We listen to all the form data change to trigger a re-render
  // and update our derived "isModified" state
  useFormData({ form });

  let predicate: (arg: [string, FieldHook]) => boolean = () => true;

  if (fieldsToDiscard) {
    predicate = ([path]) => fieldsToDiscard[path] === undefined;
  }

  let isModified = Object.entries(getFields())
    .filter(predicate)
    .some(([_, field]) => field.isModified);

  if (isModified) {
    return isModified;
  }

  // Check if any field has been removed.
  // If somme field has been removed **and** they were originaly present on the
  // form "defaultValue" then the form has been modified.
  const formDefaultValue = __getFormDefaultValue();
  const fieldOnFormDefaultValue = (path: string) => Boolean(get(formDefaultValue, path));

  const fieldsRemovedFromDOM: string[] = fieldsToDiscard
    ? Object.keys(__getFieldsRemoved())
        .filter((path) => fieldsToDiscard[path] === undefined)
        .filter(fieldOnFormDefaultValue)
    : Object.keys(__getFieldsRemoved()).filter(fieldOnFormDefaultValue);

  isModified = fieldsRemovedFromDOM.length > 0;

  return isModified;
};
