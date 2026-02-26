/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { DEFAULT_SPACE_ID, getSpaceIdFromPath } from '@kbn/spaces-utils';

/**
 * Get the NPRE for a given space ID or a request carrying a URL.
 *
 * When a request object is provided, the space is extracted from the URL pathname.
 *
 * **Assumption**: this function assumes that the server base path is `/` (the
 * default). If Kibana is configured with a custom `server.basePath`, the base
 * path prefix will not be stripped before matching the space segment, causing
 * the function to always fall back to the default space. CPS is a
 * Serverless-only feature and Serverless deployments always run at the root
 * path, so this is not a practical concern today.
 *
 * @param spaceIdOrRequest - The space ID string, or an object with a `url: URL` property
 * @returns The NPRE
 * @throws {Error} if a Request-like object without a `url` is provided.
 *   This is not expected in normal use but guards against JavaScript callers
 *   bypassing the type system.
 */
export function getSpaceNPRE(spaceIdOrRequest: string | { url: URL }): string {
  if (typeof spaceIdOrRequest === 'string') {
    return `kibana_space_${spaceIdOrRequest || DEFAULT_SPACE_ID}_default`;
  }
  // Explicitly widen to URL | undefined so the defensive check below is valid.
  const url: URL | undefined = spaceIdOrRequest.url;
  if (!url) {
    throw new Error(`Cannot determine space NPRE: the Request object is missing a 'url' property.`);
  }
  return `kibana_space_${getSpaceIdFromPath(url.pathname).spaceId}_default`;
}
