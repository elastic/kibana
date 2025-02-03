/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { AxiosError } from 'axios';
export class KbnClientRequesterError extends Error {
  axiosError?: AxiosError;
  constructor(message: string, error: unknown) {
    super(message);
    this.name = 'KbnClientRequesterError';
    if (error instanceof AxiosError) this.axiosError = clean(error);
  }
}
function clean(error: Error): AxiosError {
  const _ = AxiosError.from(error);
  delete _.cause;
  delete _.config;
  delete _.request;
  delete _.response;
  return _;
}
