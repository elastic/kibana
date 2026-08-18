/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { CoreStart, KibanaRequest } from '@kbn/core/server';
import { HTTPAuthorizationHeader, isUiamCredential } from '@kbn/core-security-server';

export const getInternalUiamCallerAttestationHeaders = (
  coreStart: CoreStart,
  request: KibanaRequest
): Record<string, string> => {
  const authorizationHeader = HTTPAuthorizationHeader.parseFromRequest(request);
  if (!authorizationHeader || !isUiamCredential(authorizationHeader)) {
    return {};
  }

  return (
    coreStart.security.authc.apiKeys.uiam?.getInternalCallerAttestationHeaders(
      authorizationHeader
    ) ?? {}
  );
};
