/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

export interface MetricsTracker {
  count: (eventName: string) => void;
  load: (eventName: string) => void;
}

export interface ESRequest {
  method: string;
  endpoint: string;
  data?: string;
}

export type BaseResponseType =
  | 'application/json'
  | 'text/csv'
  | 'text/tab-separated-values'
  | 'text/plain'
  | 'application/yaml'
  | 'unknown'
  | 'application/vnd.mapbox-vector-tile';
