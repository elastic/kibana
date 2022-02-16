/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { Metric } from '../../../../common/types';
import { TimeseriesVisParams } from '../../../types';

export const createNumberHandler = (
  handleChange: (partialModel: Partial<TimeseriesVisParams>) => void
) => {
  return (name: keyof Metric, params?: { defaultValue?: string; isClearable?: boolean }) =>
    (e: React.ChangeEvent<HTMLInputElement>) =>
      handleChange?.({
        [name]:
          params?.isClearable && !e.target.value
            ? undefined
            : Number(e.target.value ?? params?.defaultValue),
      });
};
