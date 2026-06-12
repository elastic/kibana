/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export const RESPONSE_STREAM_API_ENDPOINT = {
  REDUCER_STREAM: '/internal/response_stream/reducer_stream',
  REDUX_STREAM: '/internal/response_stream/redux_stream',
  SIMPLE_STRING_STREAM: '/internal/response_stream/simple_string_stream',
} as const;
