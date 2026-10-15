/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { KIBANA_API_PREFIX } from '../../../../../common/constants';
import type { KibanaApiDocLinksMap } from '../../../../../common/types/api_responses';

const getKibanaRequestPath = (url: string): string => {
  const withoutPrefix = url.startsWith(KIBANA_API_PREFIX)
    ? url.slice(KIBANA_API_PREFIX.length)
    : url;
  const [path] = withoutPrefix.split('?');
  return path;
};

const isPathParamSegment = (segment: string): boolean =>
  segment.startsWith('{') && segment.endsWith('}');

/*
 * Matches a Kibana request (method + url) against the path templates in the
 * generated doc links map and returns the matching operationId, preferring
 * the template with the fewest path parameters when more than one matches
 * (e.g. a literal path wins over a templated one). Returns null if no
 * template matches.
 */
export const getKibanaApiOperationId = (
  method: string,
  url: string,
  docLinks: KibanaApiDocLinksMap
): string | null => {
  const path = getKibanaRequestPath(url);
  const segments = path.split('/').filter(Boolean);
  const methodKey = method.toLowerCase();

  let best: { operationId: string; paramCount: number } | null = null;

  for (const [template, methods] of Object.entries(docLinks)) {
    const operationId = methods[methodKey];
    if (!operationId) {
      continue;
    }

    const templateSegments = template.split('/').filter(Boolean);
    if (templateSegments.length !== segments.length) {
      continue;
    }

    let paramCount = 0;
    let isMatch = true;
    for (let i = 0; i < templateSegments.length; i++) {
      const templateSegment = templateSegments[i];
      if (isPathParamSegment(templateSegment)) {
        paramCount++;
        continue;
      }
      if (templateSegment !== segments[i]) {
        isMatch = false;
        break;
      }
    }

    if (isMatch && (!best || paramCount < best.paramCount)) {
      best = { operationId, paramCount };
    }
  }

  return best?.operationId ?? null;
};

/*
 * Builds the "Open API reference" deep link for a Kibana (kbn:) request, or
 * null if no operation matches, in which case callers should fall back to
 * the general Kibana API reference link.
 */
export const getKibanaApiDocLink = (
  method: string,
  url: string,
  docLinks: KibanaApiDocLinksMap,
  kibanaApiReferenceBaseUrl: string
): string | null => {
  const operationId = getKibanaApiOperationId(method, url, docLinks);
  if (!operationId) {
    return null;
  }
  return `${kibanaApiReferenceBaseUrl}operation/operation-${operationId}`;
};
