/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { DATA_FORMATTERS } from '../../../../common/enums';
import { isDuration } from './durations';

export const getFormatterType = (formatter: string) => {
  if (
    [
      DATA_FORMATTERS.NUMBER,
      DATA_FORMATTERS.BYTES,
      DATA_FORMATTERS.PERCENT,
      DATA_FORMATTERS.DEFAULT,
    ].includes(formatter as DATA_FORMATTERS)
  ) {
    return formatter as DATA_FORMATTERS;
  }

  return formatter && isDuration(formatter) ? DATA_FORMATTERS.DURATION : DATA_FORMATTERS.CUSTOM;
};
