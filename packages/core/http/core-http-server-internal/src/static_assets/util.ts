/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { URL, format } from 'node:url';

function isEmptyPathname(pathname: string): boolean {
  return !pathname || pathname === '/';
}

/**
 * Ensure only a single leading slash and a no trailing slash
 * @note Safe to use with full URLs or paths
 */
function normalizeTrailingSlashes(string: string): string {
  return string.replace(/\/+$/, '');
}

export function removeLeadSlashes(string: string): string {
  return string.replace(/^\/+/, '');
}

export function suffixValueToURLPathname(urlString: string, value: string): string {
  const url = new URL(urlString);
  url.pathname = suffixValueToPathname(url.pathname, value);
  return format(url);
}

/**
 * Appends a value to pathname. Pathname is assumed to come from URL.pathname
 * Also do some quality control on the path to ensure that it matches URL.pathname.
 */
export function suffixValueToPathname(pathname: string, value: string): string {
  return normalizeTrailingSlashes(isEmptyPathname(pathname) ? `/${value}` : `${pathname}/${value}`);
}
