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
  fields: [
    'http.request.method',
    'url.path',
    'http.response.status_code',
    'http.response.bytes',
    'client.ip',
    'user.agent',
    'referrer',
    'message',
    'log.level',
    'source.ip',
    'destination.ip',
  ],
} as const;

export type ApacheErrorLogsProfile = typeof APACHE_ERROR_LOGS_PROFILE;
