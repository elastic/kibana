/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { LogLevelId } from '@kbn/logging';
import type { WorkerLoggingConfig } from '@kbn/core-threads-server-internal';

interface LoggerConfigSubset {
  name?: string;
  appenders?: string[];
  level?: LogLevelId;
}

/** The parts of the static `logging` config the worker needs. */
export interface LoggingConfigSubset {
  appenders?: Map<string, { type?: string; layout?: { type?: string } }>;
  loggers?: LoggerConfigSubset[];
  root?: LoggerConfigSubset;
}

/** Service fields that never change after startup. */
export interface WorkerServiceFields {
  nodeRoles: readonly string[];
  version: string;
}

const ROOT_LOGGER = 'root';
/** Core's built-in appenders, used when the config doesn't redefine them. */
const BUILT_IN_CONSOLE_APPENDERS = new Set(['default', 'console']);

/** Snapshots the logger's level and console format, plus the static service fields, for the worker. */
export const resolveWorkerLogging = (
  { appenders, loggers = [], root }: LoggingConfigSubset,
  loggerName: string,
  { nodeRoles, version }: WorkerServiceFields
): WorkerLoggingConfig => {
  const byName = new Map<string, LoggerConfigSubset>([
    [ROOT_LOGGER, { appenders: ['default'], level: 'info', ...root }],
    ...loggers.map((logger): [string, LoggerConfigSubset] => [logger.name ?? '', logger]),
  ]);
  const chain = loggerName
    .split('.')
    .map((_, index, parts) => parts.slice(0, parts.length - index).join('.'))
    .concat(ROOT_LOGGER)
    .flatMap((name) => {
      const config = byName.get(name);
      return config ? [config] : [];
    });

  const level = chain.find((config) => config.level)?.level ?? 'info';

  const effectiveAppenders =
    chain.find((config) => (config.appenders ?? []).length > 0)?.appenders ?? [];
  const consoleLayouts = effectiveAppenders.flatMap((name) => {
    const appender = appenders?.get(name);
    if (appender) {
      return appender.type === 'console' ? [appender.layout?.type] : [];
    }
    return BUILT_IN_CONSOLE_APPENDERS.has(name) ? ['pattern'] : [];
  });

  return {
    context: loggerName,
    level,
    format:
      consoleLayouts.length === 0 ? undefined : consoleLayouts.includes('json') ? 'json' : 'text',
    service: { node: { roles: nodeRoles }, version, type: 'kibana' },
  };
};
