/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import { AxiosHeaders } from 'axios';

/**
 * Creates a mock AxiosResponse for testing API matchers.
 */
export function createApiResponse<T>(options: Partial<AxiosResponse<T>> = {}): AxiosResponse<T> {
  const { data, status = 200, statusText = 'OK', headers = {} } = options;

  const config: InternalAxiosRequestConfig = {
    headers: new AxiosHeaders(),
  };

  const response: AxiosResponse<T> = {
    data: data as T,
    status,
    statusText,
    headers,
    config,
    request: {},
  };

  return response;
}

/**
 * Format error messages for API matchers like Playwright.
 */
export function createMatcherError(
  expected: unknown,
  matcherName: string,
  received: unknown,
  isNegated = false
): Error {
  const gray = '\x1b[90m';
  const red = '\x1b[31m';
  const green = '\x1b[32m';
  const reset = '\x1b[0m';

  // Gray for syntax, red for received, green for expected, matcherName in default (white)
  const matcherCall =
    `${gray}expect(${red}received${gray}).${reset}` +
    `${matcherName}` +
    `${gray}(${green}expected${gray})${reset}`;

  return new Error(
    `${matcherCall}\n\n` +
      `Expected: ${isNegated ? 'not ' : ''}${green}${expected}${reset}\n` +
      `Received: ${red}${received}${reset}`
  );
}
