/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { ESQL_CACHEABLE_GET_MAX_QUERY_LENGTH } from '@kbn/esql-types';

/**
 * Whether the encoded query string is short enough to send via cacheable GET instead of POST.
 */
export const fitsInCacheableGetRequest = (params: Record<string, string | undefined>): boolean => {
  const definedParams = Object.entries(params).filter(
    (entry): entry is [string, string] => entry[1] !== undefined && entry[1] !== ''
  );
  return (
    new URLSearchParams(definedParams).toString().length <= ESQL_CACHEABLE_GET_MAX_QUERY_LENGTH
  );
};
