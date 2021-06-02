/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { parseEndpoint } from './parse_endpoint';

export function formatRequest(endpoint: string, pathParams: Record<string, any> = {}) {
  const { method, pathname: rawPathname } = parseEndpoint(endpoint);

  // replace template variables with path params
  const pathname = Object.keys(pathParams).reduce((acc, paramName) => {
    return acc.replace(`{${paramName}}`, pathParams[paramName]);
  }, rawPathname);

  return { method, pathname };
}
