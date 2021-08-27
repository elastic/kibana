/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import type { EuiSelectableOption } from '@elastic/eui';
import type { SerializerFunc } from '../hook_form_lib/types';

export const multiSelectComponent: Record<string, SerializerFunc<string[]>> = {
  /**
   * Return an array of labels of all the options that are selected
   *
   * @param value The Eui Selectable options array
   */
  optionsToSelectedValue(options: EuiSelectableOption[]): string[] {
    return options.filter((option) => option.checked === 'on').map((option) => option.label);
  },
};

interface StripEmptyFieldsOptions {
  types?: Array<'string' | 'object'>;
  recursive?: boolean;
}

/**
 * Strip empty fields from a data object.
 * Empty fields can either be an empty string (one or several blank spaces) or an empty object (no keys)
 *
 * @param object Object to remove the empty fields from.
 * @param types An array of types to strip. Types can be "string" or "object". Defaults to ["string", "object"]
 * @param options An optional configuration object. By default recursive it turned on.
 */
export const stripEmptyFields = (
  object?: { [key: string]: any },
  options?: StripEmptyFieldsOptions
): { [key: string]: any } => {
  if (object === undefined) {
    return {};
  }

  const { types = ['string', 'object'], recursive = false } = options || {};

  return Object.entries(object).reduce((acc, [key, value]) => {
    const type = typeof value;
    const shouldStrip = types.includes(type as 'string');

    if (shouldStrip && type === 'string' && value.trim() === '') {
      return acc;
    } else if (type === 'object' && !Array.isArray(value) && value !== null) {
      if (Object.keys(value).length === 0 && shouldStrip) {
        return acc;
      } else if (recursive) {
        value = stripEmptyFields({ ...value }, options);
      }
    }

    acc[key] = value;
    return acc;
  }, {} as { [key: string]: any });
};
