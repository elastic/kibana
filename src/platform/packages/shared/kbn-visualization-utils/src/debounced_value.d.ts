/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Debounces value changes and updates inputValue on root state changes if no debounced changes
 * are in flight because the user is currently modifying the value.
 *
 * * allowFalsyValue: update upstream with all falsy values but null or undefined
 * * wait: debounce timeout
 */
export declare const useDebouncedValue: <T>(
  {
    onChange,
    value,
    defaultValue,
  }: {
    onChange: (val: T) => void;
    value: T;
    defaultValue?: T;
  },
  {
    allowFalsyValue,
    wait,
  }?: {
    allowFalsyValue?: boolean;
    wait?: number;
  }
) => {
  inputValue: T;
  handleInputChange: (val: T) => void;
  initialValue: T;
};
