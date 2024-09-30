/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { createRegExpPatternFrom, testPatternAgainstAllowedList } from '@kbn/data-view-utils';
import type { LogsDataAccessPluginStart } from '@kbn/logs-data-access-plugin/public';

export interface LogsContextService {
  isLogsIndexPattern(indexPattern: unknown): boolean;
}

export interface LogsContextServiceDeps {
  logsDataAccessPlugin?: LogsDataAccessPluginStart;
}

export const DEFAULT_ALLOWED_LOGS_BASE_PATTERNS = [
  'log',
  'logs',
  'logstash',
  'auditbeat',
  'filebeat',
  'winlogbeat',
];

export const DEFAULT_ALLOWED_LOGS_BASE_PATTERNS_REGEXP = createRegExpPatternFrom(
  DEFAULT_ALLOWED_LOGS_BASE_PATTERNS
);

export const createLogsContextService = async ({
  logsDataAccessPlugin,
}: LogsContextServiceDeps) => {
  let logSources: string[] | undefined;

  if (logsDataAccessPlugin) {
    const logSourcesService = logsDataAccessPlugin.services.logSourcesService;
    logSources = (await logSourcesService.getLogSources())
      .map((logSource) => logSource.indexPattern)
      .join(',') // TODO: Will be replaced by helper in: https://github.com/elastic/kibana/pull/192003
      .split(',');
  }

  const ALLOWED_LOGS_DATA_SOURCES = [
    DEFAULT_ALLOWED_LOGS_BASE_PATTERNS_REGEXP,
    ...(logSources ? logSources : []),
  ];

  return getLogsContextService(ALLOWED_LOGS_DATA_SOURCES);
};

export const getLogsContextService = (allowedDataSources: Array<string | RegExp>) => {
  const isLogsIndexPattern = (indexPattern: unknown) => {
    return (
      typeof indexPattern === 'string' &&
      testPatternAgainstAllowedList(allowedDataSources)(indexPattern)
    );
  };

  return {
    isLogsIndexPattern,
  };
};
