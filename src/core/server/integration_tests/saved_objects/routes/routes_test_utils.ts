/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { SavedObjectConfig } from '@kbn/core-saved-objects-base-server-internal';

export function setupConfig(allowAccess: boolean = false) {
  const config = {
    allowHttpApiAccess: allowAccess,
  } as SavedObjectConfig;
  return config;
}

export const deprecationMock = {
  documentationUrl: 'http://elastic.co',
  severity: 'warning' as const,
  reason: {
    type: 'deprecate' as const,
  },
};

export const legacyDeprecationMock = {
  documentationUrl: 'http://elastic.co',
  severity: 'warning' as const,
  reason: {
    type: 'remove' as const,
  },
};
