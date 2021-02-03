/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { AxiosError, AxiosResponse } from 'axios';

export interface AxiosRequestError extends AxiosError {
  response: undefined;
}

export interface AxiosResponseError<T> extends AxiosError {
  response: AxiosResponse<T>;
}

export const isAxiosRequestError = (error: any): error is AxiosRequestError => {
  return error && error.config && error.response === undefined;
};

export const isAxiosResponseError = <T = any>(error: any): error is AxiosResponseError<T> => {
  return error && error.response && error.response.status !== undefined;
};
