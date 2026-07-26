/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export const parseStringToBoolean = (
  value: string | undefined,
  defaultValue?: boolean
): boolean => {
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

import { getStringOpt } from './scenario_opts_helpers';

export const parseLogsScenarioOpts = (
  scenarioOpts: Record<string, unknown> | undefined
): LogsScenarioOpts => {
  const isLogsDb = parseStringToBoolean(getStringOpt(scenarioOpts, 'logsdb'));

  return {
    isLogsDb,
  };
};
