/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Configuration for Default Logs profile recommended fields.
 * This is used as a fallback when no specific log sub-profile matches.
 * The wildcard pattern 'logs-*' ensures these fields are available for
 * any logs index that doesn't have more specific profile.
 */
export const DEFAULT_LOGS_PROFILE = {
  pattern: 'logs-*',
  recommendedFields: ['event.dataset', 'host.name', 'log.level', 'message', 'service.name'],
} as const;

export type DefaultLogsProfile = typeof DEFAULT_LOGS_PROFILE;
