/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { parseEndpoint } from './parse_endpoint';

export function formatRequest(endpoint: string, pathParams: Record<string, any> = {}) {
  const { method, pathname: rawPathname, version } = parseEndpoint(endpoint);
  const optionalReg = /(\/\{\w+\?\})/g; // /{param?}
  const optionalMidReg = /(\/\{\w+\?\}\/)/g; // /{param?}/

  if ((rawPathname.match(optionalMidReg) ?? []).length > 0) {
    throw new Error('An optional parameter is allowed only at the end of the path');
  }
  const optionalOrRequiredParamsReg = /(\/{)((.+?))(\})/g;
  if (Object.keys(pathParams)?.length === 0) {
    const pathname = rawPathname.replace(optionalOrRequiredParamsReg, '');
    return { method, pathname, version };
  }

  const pathname = Object.keys(pathParams).reduce((acc, paramName) => {
    return acc
      .replace(`{${paramName}}`, pathParams[paramName])
      .replace(
        optionalReg,
        rawPathname?.includes(`/{${paramName}?}`) ? `/${pathParams[paramName]}` : ''
      );
  }, rawPathname);

  return { method, pathname, version };
}
