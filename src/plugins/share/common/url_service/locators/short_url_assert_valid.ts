/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

const REGEX = /^\/app\/[^/]+.+$/;

export function shortUrlAssertValid(url: string) {
  if (!REGEX.test(url) || url.includes('/../')) throw new Error(`Invalid short URL: ${url}`);
}
