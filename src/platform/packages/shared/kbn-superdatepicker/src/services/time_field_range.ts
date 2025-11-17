/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { TIME_FIELD_RANGE_ENDPOINT } from '../constants';
import type { GetTimeFieldRangeOptions, GetTimeFieldRangeResponse } from '../types';

export const getTimeFieldRange = async (options: GetTimeFieldRangeOptions) => {
  const { http, signal, ...body } = options;

  return await http.fetch<GetTimeFieldRangeResponse>({
    path: TIME_FIELD_RANGE_ENDPOINT,
    method: 'POST',
    body: JSON.stringify(body),
    version: '1',
    ...(signal ? { signal } : {}),
  });
};
