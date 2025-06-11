/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { schema } from '@kbn/config-schema';

const refreshIntervalSavedObjectSchema = schema.object({
  pause: schema.boolean(),
  value: schema.number(),
  display: schema.maybe(schema.string()),
  section: schema.maybe(schema.number()),
});

const isRefreshIntervalSavedObject = (
  refreshInterval: unknown
): refreshInterval is { pause: boolean; value: number } => {
  try {
    return Boolean(refreshIntervalSavedObjectSchema.validate(refreshInterval));
  } catch {
    return false;
  }
};

export const transformRefreshInterval = (
  refreshInterval: unknown
): { refreshInterval?: { pause: boolean; value: number } } => {
  if (!isRefreshIntervalSavedObject(refreshInterval)) return {};
  return {
    refreshInterval: {
      pause: refreshInterval.pause,
      value: refreshInterval.value,
    },
  };
};
