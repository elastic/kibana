/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Setup } from './journey';

export interface Header {
  readonly name: string;
  readonly value: string;
}

export interface Request {
  readonly timestamp: number;
  readonly date: string;
  readonly transactionId: string;
  readonly method: string;
  readonly path: string;
  readonly headers: readonly Header[];
  readonly body?: string;
}

export interface Simulation {
  readonly simulationName: string;
  readonly packageName: string;
  readonly scenarioName: string;
  readonly baseUrl: string;
  readonly scalabilitySetup: Setup;
  readonly requests: readonly Request[];
}
