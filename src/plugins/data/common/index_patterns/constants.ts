/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

export const RUNTIME_FIELD_TYPES = [
  'keyword',
  'long',
  'double',
  'date',
  'ip',
  'boolean',
  'geo_point',
] as const;

/**
 * Used to determine if the instance has any user created data by filtering data created by Fleet server
 */
export const KNOWN_FLEET_ASSETS = {
  LOGS_INDEX_PATTERN: 'logs-*',
  METRICS_INDEX_PATTERN: 'metrics-*',
  INDEX_PREFIXES_TO_IGNORE: [
    '.ds-metrics-elastic_agent', // ignore index created by Fleet server itself
    '.ds-logs-elastic_agent', // ignore index created by Fleet server itself
  ],
};
