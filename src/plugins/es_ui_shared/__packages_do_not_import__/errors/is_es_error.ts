/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import * as legacyElasticsearch from 'elasticsearch';

const esErrorsParent = legacyElasticsearch.errors._Abstract;

interface RequestError extends Error {
  statusCode?: number;
}

/*
 * @deprecated
 * Only works with legacy elasticsearch js client errors and will be removed after 7.x last
 */
export function isEsError(err: RequestError) {
  const isInstanceOfEsError = err instanceof esErrorsParent;
  const hasStatusCode = Boolean(err.statusCode);

  return isInstanceOfEsError && hasStatusCode;
}
