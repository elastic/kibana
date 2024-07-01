/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

/**
 * Replaces placeholders in a path string with provided param value
 *
 * @param path Path string with placeholders for params
 * @param params Object with params to replace
 * @returns Path string with params replaced
 */
export function replaceParams(path: string, params: Record<string, string | number>): string {
  let output = path;
  Object.entries(params).forEach(([param, value]) => {
    output = path.replace(`{${param}}`, `${value}`);
  });
  return output;
}
