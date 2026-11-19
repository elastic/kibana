/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import supertest from 'supertest';
import {
  wrapKibanaSupertestAgent,
  type WrapKibanaSupertestAgentOptions,
} from './wrap_kibana_supertest_agent';

export { isEluRateLimiter429, getEluRateLimiterRetryDelayMs } from './is_elu_rate_limiter_429';
export {
  wrapKibanaSupertestAgent,
  type KibanaSupertestAgent,
  type WrapKibanaSupertestAgentOptions,
} from './wrap_kibana_supertest_agent';

/** Supertest against a Kibana listener/URL with ELU 429 retries (for Jest integration tests). */
export const kibanaSupertest = (
  app: Parameters<typeof supertest>[0],
  options?: Parameters<typeof supertest>[1],
  wrapOptions?: WrapKibanaSupertestAgentOptions
): ReturnType<typeof supertest> =>
  wrapKibanaSupertestAgent(supertest(app, options), wrapOptions) as ReturnType<typeof supertest>;
