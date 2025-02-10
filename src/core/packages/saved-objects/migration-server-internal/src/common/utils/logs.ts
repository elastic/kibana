/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Logger, LogMeta } from '@kbn/logging';
import { MigrationLog } from '../../types';

export interface LogAwareState {
  controlState: string;
  logs: MigrationLog[];
}

interface StateTransitionLogMeta extends LogMeta {
  kibana: {
    migrations: {
      state: LogAwareState;
      duration: number;
    };
  };
}

export const logStateTransition = (
  logger: Logger,
  logPrefix: string,
  prevState: LogAwareState,
  currState: LogAwareState,
  tookMs: number
) => {
  if (currState.logs.length > prevState.logs.length) {
    currState.logs.slice(prevState.logs.length).forEach(({ message, level }) => {
      switch (level) {
        case 'error':
          return logger.error(logPrefix + message);
        case 'warning':
          return logger.warn(logPrefix + message);
        case 'info':
          return logger.info(logPrefix + message);
        default:
          throw new Error(`unexpected log level ${level}`);
      }
    });
  }

  const logMessage = `${logPrefix}${prevState.controlState} -> ${currState.controlState}. took: ${tookMs}ms.`;
  if (logger.isLevelEnabled('debug')) {
    logger.debug<StateTransitionLogMeta>(logMessage, {
      kibana: {
        migrations: {
          state: currState,
          duration: tookMs,
        },
      },
    });
  } else {
    logger.info(logMessage);
  }
};

export const logActionResponse = (
  logger: Logger,
  logMessagePrefix: string,
  state: LogAwareState,
  res: unknown
) => {
  logger.debug(logMessagePrefix + `${state.controlState} RESPONSE`);
};
