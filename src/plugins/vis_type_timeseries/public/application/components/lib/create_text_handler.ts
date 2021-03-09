/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { TimeseriesVisParams } from '../../../types';
// @ts-expect-error TODO: remove detectIE if possible
import { detectIE } from './detect_ie';

export const createTextHandler = (
  handleChange: (partialModel: Partial<TimeseriesVisParams>) => void
) => {
  return (name: keyof TimeseriesVisParams, defaultValue?: string) => (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    // IE preventDefault breaks input, but we still need top prevent enter from being pressed
    if (!detectIE() || e.keyCode === 13) e.preventDefault();

    return handleChange({ [name]: e.target.value ?? defaultValue });
  };
};
