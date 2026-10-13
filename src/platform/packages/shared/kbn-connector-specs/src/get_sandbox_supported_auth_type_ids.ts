/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ConnectorSpec } from './connector_spec';

/** Auth type ids from a connector spec that opted into sandbox credential injection. */
export const getSandboxSupportedAuthTypeIds = (auth: ConnectorSpec['auth']): readonly string[] => {
  if (!auth?.types) {
    return [];
  }

  return auth.types.flatMap((authType) => {
    if (typeof authType === 'string' || authType.supportsSandbox !== true) {
      return [];
    }
    return [authType.type];
  });
};
