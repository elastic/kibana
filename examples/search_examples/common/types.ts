/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {
  IEsSearchRequest,
  IEsSearchResponse,
  IKibanaSearchRequest,
  IKibanaSearchResponse,
} from '@kbn/data-plugin/common';

export interface IMyStrategyRequest extends IEsSearchRequest {
  get_cool: boolean;
}
export interface IMyStrategyResponse extends IEsSearchResponse {
  cool: string;
  executed_at: number;
}

export type FibonacciRequest = IKibanaSearchRequest<{ n: number }>;

export type FibonacciResponse = IKibanaSearchResponse<{ values: number[] }>;
