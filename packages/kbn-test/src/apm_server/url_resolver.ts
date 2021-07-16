/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { uriencode } from '../utils';

/**
 * A template literal tag that encodes each variable using encodeURIComponent(), then
 * resolves the path relative to the BUCKET_URL,
 */
export const createUrlResolver = (baseUrl: URL) => (
  strings: TemplateStringsArray,
  ...vars: string[]
) => {
  const path = uriencode(strings, ...vars);
  const relative = path.startsWith('/') ? path.slice(1) : path;
  return new URL(relative, baseUrl).href;
};
