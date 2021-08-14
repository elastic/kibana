/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
export const PRODUCT_RESPONSE_HEADER = 'x-elastic-product';
/**
 * Response headers check to determine if the response is from Elasticsearch
 * @param headers Response headers
 * @returns boolean
 */
// This check belongs to the elasticsearch service as a dedicated helper method.
export const isSupportedEsServer = (headers: Record<string, string | string[]> | null) => {
  return !!headers && headers[PRODUCT_RESPONSE_HEADER] === 'Elasticsearch';
};
