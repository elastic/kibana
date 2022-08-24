/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { estypes } from '@elastic/elasticsearch';

/**
 * The status a request can have.
 */
export enum RequestStatus {
  /**
   * The request hasn't finished yet.
   */
  PENDING,
  /**
   * The request has successfully finished.
   */
  OK,
  /**
   * The request failed.
   */
  ERROR,
}

export interface Request extends RequestParams {
  id: string;
  name: string;
  json?: object;
  response?: Response;
  startTime: number;
  stats?: RequestStatistics;
  status: RequestStatus;
  time?: number;
}

export interface RequestParams {
  id?: string;
  description?: string;
  searchSessionId?: string;
}

export interface RequestStatistics {
  [key: string]: RequestStatistic;
}

export interface RequestStatistic {
  label: string;
  description?: string;
  value: any;
}

export interface Response {
  json?: object;
  time?: number;
}

/**
 * A callback function which can intercept warnings when passed to {@link showWarnings}. Pass `true` from the
 * function to prevent the search service from showing warning notifications by default.
 * @public
 */
export type WarningHandlerCallback = (warnings: SearchResponseWarning) => boolean | undefined;

/**
 * Format of warnings of failed shards or internal ES timeouts that surface from search responses
 * @public
 */
export interface SearchResponseWarning {
  /**
   * type:  for handling the warning in logic
   */
  type: 'timed_out' | 'generic_shard_warning' | estypes.ShardFailure['reason']['reason'];
  /**
   * isTimeout: true for general internal ES timeout warning
   */
  isTimeout?: boolean;
  /**
   * isTimeout: true for shard-specific internal ES warning
   */
  isShardFailure?: boolean;
  /**
   * message: failure reason from ES
   */
  message: string;
  /**
   * text: human-friendly error message
   */
  text?: string;
  /**
   * full request including response, if availble
   */
  request: Request;
}
