/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { createRegExpPatternFrom, testPatternAgainstAllowedList } from '@kbn/data-view-utils';

export interface LogsContextService {
  isLogsIndexPattern(indexPattern: unknown): boolean;
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface LogsContextServiceDeps {
  // We will probably soon add uiSettings as a dependency
  // to consume user configured indices
}

export const DEFAULT_ALLOWED_LOGS_BASE_PATTERNS = [
  'log',
  'logs',
  'logstash',
  'auditbeat',
  'filebeat',
  'winlogbeat',
];

export const createLogsContextService = (_deps: LogsContextServiceDeps = {}) => {
  // This is initially an hard-coded set of well-known base patterns,
  // we can extend this allowed list with any setting coming from uiSettings
  const ALLOWED_LOGS_DATA_SOURCES = [createRegExpPatternFrom(DEFAULT_ALLOWED_LOGS_BASE_PATTERNS)];

  const isLogsIndexPattern = (indexPattern: unknown) => {
    return (
      typeof indexPattern === 'string' &&
      testPatternAgainstAllowedList(ALLOWED_LOGS_DATA_SOURCES)(indexPattern)
    );
  };

  return {
    isLogsIndexPattern,
  };
};
