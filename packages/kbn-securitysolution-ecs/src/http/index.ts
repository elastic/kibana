/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

export interface HttpEcs {
  version?: string[];

  request?: HttpRequestData;

  response?: HttpResponseData;
}

export interface HttpRequestData {
  method?: string[];

  body?: HttpBodyData;

  referrer?: string[];

  bytes?: number[];
}

export interface HttpBodyData {
  content?: string[];

  bytes?: number[];
}

export interface HttpResponseData {
  status_code?: number[];

  body?: HttpBodyData;

  bytes?: number[];
}
