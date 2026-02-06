/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Configuration for Apache Error Logs profile recommended fields
 */
export const APACHE_ERROR_LOGS_PROFILE = {
  pattern: 'logs-apache.error',
  recommendedFields: [
    'client.ip',
    'destination.ip',
    'http.request.method',
    'http.response.bytes',
    'http.response.status_code',
    'log.level',
    'message',
    'referrer',
    'source.ip',
    'url.path',
    'user.agent',
  ],
} as const;

export type ApacheErrorLogsProfile = typeof APACHE_ERROR_LOGS_PROFILE;
