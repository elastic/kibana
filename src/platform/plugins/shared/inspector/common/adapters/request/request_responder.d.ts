/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Request, RequestStatistics, Response } from './types';
import type { RequestStatus } from './types';
/**
 * An API to specify information about a specific request that will be logged.
 * Create a new instance to log a request using {@link RequestAdapter#start}.
 */
export declare class RequestResponder {
  private readonly request;
  private readonly onChange;
  constructor(request: Request, onChange: () => void);
  json(reqJson: object): RequestResponder;
  stats(stats: RequestStatistics): RequestResponder;
  finish(status: RequestStatus, response: Response): void;
  ok(response: Response): void;
  error(response: Response): void;
}
