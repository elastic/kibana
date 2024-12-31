/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { TimeseriesVisParams } from '../../../types';

// TODO: replace with explicit callback in each component
export const createTextHandler = (
  handleChange: (partialModel: Partial<TimeseriesVisParams>) => void
) => {
  return (name: keyof TimeseriesVisParams, defaultValue?: string) =>
    (e: React.ChangeEvent<HTMLInputElement>) =>
      handleChange({ [name]: e.target.value ?? defaultValue });
};
