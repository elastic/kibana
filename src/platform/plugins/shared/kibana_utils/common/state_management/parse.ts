/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ParsedQuery } from 'query-string';

const ABSOLUTE_URL_BASE = 'http://localhost';

interface ParsedUrl {
  auth: string | null;
  hash: string | null;
  host: string | null;
  hostname: string | null;
  path: string | null;
  pathname: string | null;
  port: string | null;
  protocol: string | null;
  query: ParsedQuery;
  search: string | null;
  slashes: boolean | null;
}

const parseAbsoluteUrl = (url: string): URL | undefined => {
  try {
    return new URL(url);
  } catch {
    return undefined;
  }
};

const parseQuery = (searchParams: URLSearchParams): ParsedQuery => {
  const query: ParsedQuery = {};

  for (const [key, value] of searchParams.entries()) {
    const existingValue = query[key];

    if (existingValue === undefined) {
      query[key] = value;
      continue;
    }

    query[key] = Array.isArray(existingValue)
      ? [...existingValue.filter((item): item is string => item !== null), value]
      : existingValue === null
      ? value
      : [existingValue, value];
  }

  return query;
};

const formatAuth = (username: string, password: string): string | null => {
  if (!username && !password) {
    return null;
  }

  if (!password) {
    return decodeURIComponent(username);
  }

  return `${decodeURIComponent(username)}:${decodeURIComponent(password)}`;
};

export const parseUrl = (url: string): ParsedUrl => {
  const absoluteUrl = parseAbsoluteUrl(url);
  const parsedUrl = absoluteUrl ?? new URL(url, ABSOLUTE_URL_BASE);
  const search = parsedUrl.search || null;

  return {
    auth: formatAuth(parsedUrl.username, parsedUrl.password),
    hash: parsedUrl.hash || null,
    host: absoluteUrl ? parsedUrl.host || null : null,
    hostname: absoluteUrl ? parsedUrl.hostname || null : null,
    path: parsedUrl.pathname || search ? `${parsedUrl.pathname}${parsedUrl.search}` : null,
    pathname: parsedUrl.pathname || null,
    port: absoluteUrl ? parsedUrl.port || null : null,
    protocol: absoluteUrl ? parsedUrl.protocol || null : null,
    query: parseQuery(parsedUrl.searchParams),
    search,
    slashes: absoluteUrl ? true : null,
  };
};

export const parseUrlHash = (url: string) => {
  const hash = parseUrl(url).hash;
  return hash ? parseUrl(hash.slice(1)) : null;
};
