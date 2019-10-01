/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { AxiosError, AxiosResponse } from 'axios';

export interface AxiosRequestError extends AxiosError {
  response: undefined;
}

export interface AxiosResponseError<T> extends AxiosError {
  response: AxiosResponse<T>;
}

export const isAxiosRequestError = (error: any): error is AxiosRequestError => {
  return error && error.code === undefined && error.response === undefined;
};

export const isAxiosResponseError = (error: any): error is AxiosResponseError<any> => {
  return error && error.code !== undefined && error.response !== undefined;
};

export const isConcliftOnGetError = (error: any) => {
  return (
    isAxiosResponseError(error) && error.config.method === 'GET' && error.response.status === 409
  );
};
