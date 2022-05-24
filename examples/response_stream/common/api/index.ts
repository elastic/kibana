/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type {
  UseFetchStreamCustomReducerParams,
  UseFetchStreamParamsDefault,
} from '@kbn/aiops-utils';

import {
  reducerStreamReducer,
  ReducerStreamRequestBodySchema,
  ReducerStreamApiAction,
} from './reducer_stream';
import { SimpleStringStreamRequestBodySchema } from './simple_string_stream';

export const API_ENDPOINT = {
  REDUCER_STREAM: '/internal/response_stream/reducer_stream',
  SIMPLE_STRING_STREAM: '/internal/response_stream/simple_string_stream',
} as const;

export interface ApiReducerStream extends UseFetchStreamCustomReducerParams {
  endpoint: typeof API_ENDPOINT.REDUCER_STREAM;
  reducer: typeof reducerStreamReducer;
  body: ReducerStreamRequestBodySchema;
  actions: ReducerStreamApiAction;
}

export interface ApiSimpleStringStream extends UseFetchStreamParamsDefault {
  endpoint: typeof API_ENDPOINT.SIMPLE_STRING_STREAM;
  body: SimpleStringStreamRequestBodySchema;
}
