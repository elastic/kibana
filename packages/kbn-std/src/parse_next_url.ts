/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { parse } from 'url';
import { isInternalURL } from './is_internal_url';

const DEFAULT_NEXT_URL_QUERY_STRING_PARAMETER = 'next';

/**
 * Parse the url value from query param. By default
 *
 * By default query param is set to next.
 */
export function parseNextURL(
  href: string,
  basePath = '',
  nextUrlQueryParam = DEFAULT_NEXT_URL_QUERY_STRING_PARAMETER
) {
  const { query, hash } = parse(href, true);

  let next = query[nextUrlQueryParam];
  if (!next) {
    return `${basePath}/`;
  }

  if (Array.isArray(next) && next.length > 0) {
    next = next[0];
  } else {
    next = next as string;
  }

  // validate that `next` is not attempting a redirect to somewhere
  // outside of this Kibana install.
  if (!isInternalURL(next, basePath)) {
    return `${basePath}/`;
  }

  return next + (hash || '');
}
