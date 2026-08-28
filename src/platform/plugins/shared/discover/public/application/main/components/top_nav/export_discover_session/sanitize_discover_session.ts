/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { HttpStart } from '@kbn/core/public';
import {
  DISCOVER_SESSION_API_VERSION,
  DISCOVER_SESSION_INTERNAL_API_BASE_PATH,
} from '../../../../../../common/constants';
import type {
  DiscoverSessionSanitizeRequest,
  DiscoverSessionSanitizeResponse,
} from '../../../../../../server';

/** Converts Discover session state to validated public API data through the server sanitizer. */
export const sanitizeDiscoverSession = async (
  http: HttpStart,
  state: DiscoverSessionSanitizeRequest
) => {
  const result = await http.post<DiscoverSessionSanitizeResponse>(
    `${DISCOVER_SESSION_INTERNAL_API_BASE_PATH}/_sanitize`,
    {
      version: DISCOVER_SESSION_API_VERSION,
      body: JSON.stringify(state),
    }
  );

  return {
    data: result.data,
    warnings: (result.warnings ?? []).map(({ message }) => message),
  };
};
