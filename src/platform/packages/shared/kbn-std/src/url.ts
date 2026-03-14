/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { UrlObject } from 'url';
import { format as formatUrl } from 'url';
import type { ParsedQuery } from 'query-string';

const ABSOLUTE_URL_BASE = 'http://localhost';

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

const parseMeaningfulUrlParts = (url: string): URLMeaningfulParts => {
  const absoluteUrl = parseAbsoluteUrl(url);
  const parsedUrl = absoluteUrl ?? new URL(url, ABSOLUTE_URL_BASE);

  return {
    auth: formatAuth(parsedUrl.username, parsedUrl.password),
    hash: parsedUrl.hash || null,
    hostname: absoluteUrl ? parsedUrl.hostname : null,
    pathname: parsedUrl.pathname || null,
    port: absoluteUrl ? parsedUrl.port || null : null,
    protocol: absoluteUrl ? parsedUrl.protocol || null : null,
    query: parseQuery(parsedUrl.searchParams),
    slashes: absoluteUrl ? true : null,
  };
};

/**
 * We define our own typings because the current version of @types/node
 * declares properties to be optional "hostname?: string".
 * Although, parse call returns "hostname: null | string".
 *
 * @public
 */
export interface URLMeaningfulParts {
  auth?: string | null;
  hash?: string | null;
  hostname?: string | null;
  pathname?: string | null;
  protocol?: string | null;
  slashes?: boolean | null;
  port?: string | null;
  query: ParsedQuery;
}

/**
 *  Takes a URL and a function that takes the meaningful parts
 *  of the URL as a key-value object, modifies some or all of
 *  the parts, and returns the modified parts formatted again
 *  as a url.
 *
 *  Url Parts sent:
 *    - protocol
 *    - slashes (does the url have the //)
 *    - auth
 *    - hostname (just the name of the host, no port or auth information)
 *    - port
 *    - pathname (the path after the hostname, no query or hash, starts
 *        with a slash if there was a path)
 *    - query (always an object, even when no query on original url)
 *    - hash
 *
 *  Why?
 *    - The default url library in node produces several conflicting
 *      properties on the "parsed" output. Modifying any of these might
 *      lead to the modifications being ignored (depending on which
 *      property was modified)
 *    - It's not always clear whether to use path/pathname, host/hostname,
 *      so this tries to add helpful constraints
 *
 *  @param url The string url to parse.
 *  @param urlModifier A function that will modify the parsed url, or return a new one.
 *  @returns The modified and reformatted url
 *  @public
 */
export function modifyUrl(
  url: string,
  urlModifier: (urlParts: URLMeaningfulParts) => Partial<URLMeaningfulParts> | void
) {
  if (typeof url !== 'string') {
    throw new TypeError('Expected URL to be a string');
  }

  if (typeof urlModifier !== 'function') {
    throw new TypeError('Expected urlModifier to be a function');
  }

  const parsed = parseMeaningfulUrlParts(url);

  // Copy over the most specific version of each property. By default, the parsed url includes several
  // conflicting properties (like path and pathname + search, or search and query) and keeping track
  // of which property is actually used when they are formatted is harder than necessary.
  const meaningfulParts: URLMeaningfulParts = {
    auth: parsed.auth,
    hash: parsed.hash,
    hostname: parsed.hostname,
    pathname: parsed.pathname,
    port: parsed.port,
    protocol: parsed.protocol,
    query: parsed.query || {},
    slashes: parsed.slashes,
  };

  // The urlModifier modifies the meaningfulParts object, or returns a new one.
  const modifiedParts = urlModifier(meaningfulParts) || meaningfulParts;

  // Format the modified/replaced meaningfulParts back into a url.
  return formatUrl({
    auth: modifiedParts.auth,
    hash: modifiedParts.hash,
    hostname: modifiedParts.hostname,
    pathname: modifiedParts.pathname,
    port: modifiedParts.port,
    protocol: modifiedParts.protocol,
    query: modifiedParts.query,
    slashes: modifiedParts.slashes,
  } as UrlObject);
}

/**
 * Determine if a url is relative. Any url including a protocol, hostname, or
 * port is not considered relative. This means that absolute *paths* are considered
 * to be relative *urls*
 * @public
 */
export function isRelativeUrl(candidatePath: string) {
  if (candidatePath.trimStart().startsWith('//')) {
    return false;
  }

  return parseAbsoluteUrl(candidatePath) === undefined;
}

/**
 * Returns the origin (protocol + host + port) from given `url` if `url` is a valid absolute url, or null otherwise
 */
export function getUrlOrigin(url: string): string | null {
  const parsedUrl = parseAbsoluteUrl(url);

  if (!parsedUrl?.protocol || !parsedUrl.hostname) {
    return null;
  }

  const authority = url.slice(parsedUrl.protocol.length + 2).split(/[/?#]/, 1)[0];
  const explicitPort = authority.match(/:(\d+)$/)?.[1];

  return `${parsedUrl.protocol}//${parsedUrl.hostname}${
    explicitPort ? `:${explicitPort}` : parsedUrl.port ? `:${parsedUrl.port}` : ''
  }`;
}
