/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ParsedQuery } from 'query-string';

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

const parseProtocolRelativeUrl = (url: string): URL | undefined => {
  if (!url.startsWith('//')) {
    return undefined;
  }

  try {
    return new URL(`http:${url}`);
  } catch {
    return undefined;
  }
};

const splitRelativeUrl = (url: string) => {
  const hashIndex = url.indexOf('#');
  const beforeHash = hashIndex === -1 ? url : url.slice(0, hashIndex);
  const hash = hashIndex === -1 ? null : url.slice(hashIndex) || null;
  const searchIndex = beforeHash.indexOf('?');
  const pathname =
    searchIndex === -1 ? beforeHash || null : beforeHash.slice(0, searchIndex) || null;
  const search = searchIndex === -1 ? null : beforeHash.slice(searchIndex) || null;

  return { hash, pathname, search };
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
  const protocolRelativeUrl = absoluteUrl ? undefined : parseProtocolRelativeUrl(url);
  const parsedUrl = absoluteUrl ?? protocolRelativeUrl;

  if (!parsedUrl) {
    const { hash, pathname, search } = splitRelativeUrl(url);

    return {
      auth: null,
      hash,
      host: null,
      hostname: null,
      path: pathname || search ? `${pathname ?? ''}${search ?? ''}` : null,
      pathname,
      port: null,
      protocol: null,
      query: parseQuery(new URLSearchParams(search?.slice(1) ?? '')),
      search,
      slashes: null,
    };
  }

  const search = parsedUrl.search || null;

  return {
    auth: formatAuth(parsedUrl.username, parsedUrl.password),
    hash: parsedUrl.hash || null,
    host: parsedUrl.host || null,
    hostname: parsedUrl.hostname || null,
    path: parsedUrl.pathname || search ? `${parsedUrl.pathname}${parsedUrl.search}` : null,
    pathname: parsedUrl.pathname || null,
    port: parsedUrl.port || null,
    protocol: absoluteUrl ? parsedUrl.protocol || null : null,
    query: parseQuery(parsedUrl.searchParams),
    search,
    slashes: true,
  };
};

export const parseUrlHash = (url: string) => {
  const hash = parseUrl(url).hash;
  return hash ? parseUrl(hash.slice(1)) : null;
};
