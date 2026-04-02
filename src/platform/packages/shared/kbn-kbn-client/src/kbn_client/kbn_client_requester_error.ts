/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export interface KbnClientResponseError {
  status?: number;
  message: string;
  code?: string;
}

export class KbnClientRequesterError extends Error {
  responseError?: KbnClientResponseError;
  /**
   * @deprecated Use `responseError.status` instead. Kept for backward compatibility.
   */
  public get axiosError(): { status?: number; response?: undefined } | undefined {
    if (!this.responseError) return undefined;
    return { status: this.responseError.status };
  }
  constructor(message: string, error: unknown) {
    super(message);
    this.name = 'KbnClientRequesterError';
    if (isResponseLikeError(error)) {
      this.responseError = clean(error);
    }
  }
}

interface ResponseLikeError {
  message?: string;
  code?: string;
  response?: { status?: number };
}

const isResponseLikeError = (error: unknown): error is ResponseLikeError => {
  return (
    error instanceof Error || (typeof error === 'object' && error !== null && 'response' in error)
  );
};

function clean(error: ResponseLikeError): KbnClientResponseError {
  const status = (error as any).response?.status ?? (error as any).status;
  return {
    status,
    message: error.message ?? 'Unknown error',
    code: error.code,
  };
}
