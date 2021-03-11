/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { TimeseriesVisParams } from '../../../types';
// @ts-expect-error
import { detectIE } from './detect_ie';

// TODO: replace with explicit callback in each component
export const createTextHandler = (
  handleChange: (partialModel: Partial<TimeseriesVisParams>) => void
) => {
  return (name: keyof TimeseriesVisParams, defaultValue?: string) => (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    // IE preventDefault breaks input, but we still need top prevent enter from being pressed <-- is not valid anymore
    // it seems there is no need to check keyCode since the handler is used for input chage event only
    // "keyCode" key does not exist in change event
    // @ts-expect-error
    if (!detectIE() || e.keyCode === 13) e.preventDefault();

    return handleChange({ [name]: e.target.value ?? defaultValue });
  };
};
