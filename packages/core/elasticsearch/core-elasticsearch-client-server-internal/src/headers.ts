/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { deepFreeze } from '@kbn/std';

/**
 * @internal
 */
export const PRODUCT_RESPONSE_HEADER = 'x-elastic-product';

/**
 * @internal
 */
export const PRODUCT_ORIGIN_HEADER = 'x-elastic-product-origin';

/**
 * @internal
 */
export const USER_AGENT_HEADER = 'user-agent';

/**
 * @internal
 */
export const RESERVED_HEADERS = deepFreeze([PRODUCT_ORIGIN_HEADER, USER_AGENT_HEADER]);

/**
 * @internal
 */
export const DEFAULT_HEADERS = deepFreeze({
  // Elasticsearch uses this to identify when a request is coming from Kibana, to allow Kibana to
  // access system indices using the standard ES APIs.
  [PRODUCT_ORIGIN_HEADER]: 'kibana',
});

/**
 * @internal
 */
export function getDefaultHeaders(kibanaVersion: string) {
  return {
    ...DEFAULT_HEADERS,
    [USER_AGENT_HEADER]: `Kibana/${kibanaVersion}`,
  };
}
