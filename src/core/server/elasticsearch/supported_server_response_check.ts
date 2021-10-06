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
export const isSupportedEsServer = (
  headers: Record<string, string | string[] | undefined> | null | undefined
) => {
  return !!headers && headers[PRODUCT_RESPONSE_HEADER] === 'Elasticsearch';
};

/**
 * Check to ensure that a 404 response does not come from Elasticsearch
 *
 * WARNING: This is a hack to work around for 404 responses returned from a proxy.
 * We're aiming to minimise the risk of data loss when consumers act on Not Found errors
 *
 * @param response response from elasticsearch client call
 * @returns boolean 'true' if the status code is 404 and the Elasticsearch product header is missing/unexpected value
 */
export const isNotFoundFromUnsupportedServer = (args: {
  statusCode: number | null;
  headers: Record<string, string | string[] | undefined> | null;
}): boolean => {
  return args.statusCode === 404 && !isSupportedEsServer(args.headers);
};
