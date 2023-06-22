/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {
  VersionedFullValidationConfig,
  VersionedRouteResponseValidationEntry,
} from '@kbn/core-http-server';

export function getResponseValidation(
  validation: undefined | VersionedFullValidationConfig<unknown, unknown, unknown>,
  status: number,
  contentType: undefined | string
): undefined | VersionedRouteResponseValidationEntry {
  const entryOrEntries = validation?.response?.[status];

  if (Array.isArray(entryOrEntries)) {
    return contentType
      ? entryOrEntries.find((entry) => entry.contentType === contentType)
      : undefined;
  }

  return entryOrEntries;
}
