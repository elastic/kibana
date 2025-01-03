/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  SendRequestConfig,
  SendRequestResponse,
  sendRequest as _sendRequest,
  Error,
} from '../shared_imports';

import { httpService } from './http';

export const sendRequest = <T = any, E = Error>(
  config: SendRequestConfig
): Promise<SendRequestResponse<T, E>> => {
  return _sendRequest(httpService.httpClient, config);
};
