/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export const parseStringToBoolean = (value: string, defaultValue?: boolean): boolean => {
  if (!value) return defaultValue ?? false;

  switch (value.trim().toLowerCase()) {
    case 'true':
      return true;
    case 'false':
      return false;
    default:
      return defaultValue ?? /true/i.test(value);
  }
};

export interface LogsScenarioOpts {
  isLogsDb: boolean;
}

export const parseLogsScenarioOpts = (
  scenarioOpts: Record<string, any> | undefined
): LogsScenarioOpts => {
  const isLogsDb = parseStringToBoolean(scenarioOpts?.logsdb);

  return {
    isLogsDb,
  };
};
