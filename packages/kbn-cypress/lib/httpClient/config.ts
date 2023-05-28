/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { AxiosError, isAxiosError } from 'axios';

export const isRetriableError = (err: AxiosError): boolean => {
  if (!isAxiosError(err)) {
    return false;
  }
  if (err.code === 'ECONNREFUSED') {
    return true;
  }
  return !!(err?.response?.status && 500 <= err.response.status && err.response.status < 600);
};

export const getDelay = (i: number) => [15 * 1000, 30 * 1000, 60 * 1000][i - 1];

let baseURL = 'https://cy.currents.dev';
export const getAPIBaseUrl = () => baseURL ?? 'https://cy.currents.dev';
export const setAPIBaseUrl = (url?: string) => (baseURL = url ?? 'https://cy.currents.dev');
