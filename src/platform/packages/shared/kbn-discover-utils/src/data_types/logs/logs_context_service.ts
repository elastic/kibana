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
  getAllLogsIndexPattern(): string | undefined;
  isLogsIndexPattern(indexPattern: unknown): boolean;
}

export interface LogsContextServiceDeps {
  logsDataAccess?: LogsDataAccessPluginStart;
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
  DEFAULT_ALLOWED_LOGS_BASE_PATTERNS,
  'data'
);

export const createLogsContextService = async ({
  logsDataAccess,
}: LogsContextServiceDeps): Promise<LogsContextService> => {
  let allLogsIndexPattern: string | undefined;
  let logSources: string[] | undefined;

  if (logsDataAccess) {
    const logSourcesService = logsDataAccess.services.logSourcesService;
    allLogsIndexPattern = (await logSourcesService.getLogSources())
      .map((logSource) => logSource.indexPattern)
      .join(','); // TODO: Will be replaced by helper in: https://github.com/elastic/kibana/pull/192003
    logSources = allLogsIndexPattern.split(',');
  }

  const ALLOWED_LOGS_DATA_SOURCES = [
    DEFAULT_ALLOWED_LOGS_BASE_PATTERNS_REGEXP,
    ...(logSources ? logSources : []),
  ];

  return getLogsContextService({
    allLogsIndexPattern,
    allowedDataSources: ALLOWED_LOGS_DATA_SOURCES,
  });
};

export const getLogsContextService = ({
  allLogsIndexPattern,
  allowedDataSources,
}: {
  allLogsIndexPattern: string | undefined;
  allowedDataSources: Array<string | RegExp>;
}): LogsContextService => {
  const getAllLogsIndexPattern = () => allLogsIndexPattern;
  const isLogsIndexPattern = (indexPattern: unknown) => {
    return (
      typeof indexPattern === 'string' &&
      testPatternAgainstAllowedList(allowedDataSources)(indexPattern)
    );
  };

  return { getAllLogsIndexPattern, isLogsIndexPattern };
};
