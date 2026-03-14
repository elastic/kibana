/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

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
  const parsedUrl = new URL(href, 'http://localhost');
  const nextValues = parsedUrl.searchParams.getAll(nextUrlQueryParam);
  if (!nextValues.length) {
    return `${basePath}/`;
  }

  const next = nextValues[0];

  // validate that `next` is not attempting a redirect to somewhere
  // outside of this Kibana install.
  if (!isInternalURL(next, basePath)) {
    return `${basePath}/`;
  }

  return next + parsedUrl.hash;
}
