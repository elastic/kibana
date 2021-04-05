/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { MetricsItemsSchema } from '../../../../common/types';
import { TimeseriesVisParams } from '../../../types';

export const createNumberHandler = (
  handleChange: (partialModel: Partial<TimeseriesVisParams>) => void
) => {
  return (name: keyof MetricsItemsSchema, defaultValue?: string) => (
    e: React.ChangeEvent<HTMLInputElement>
  ) => handleChange?.({ [name]: Number(e.target.value ?? defaultValue) });
};
