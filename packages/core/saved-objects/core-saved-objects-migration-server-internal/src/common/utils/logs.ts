/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
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
  logMessagePrefix: string,
  prevState: LogAwareState,
  currState: LogAwareState,
  tookMs: number
) => {
  if (currState.logs.length > prevState.logs.length) {
    currState.logs.slice(prevState.logs.length).forEach(({ message, level }) => {
      switch (level) {
        case 'error':
          return logger.error(logMessagePrefix + message);
        case 'warning':
          return logger.warn(logMessagePrefix + message);
        case 'info':
          return logger.info(logMessagePrefix + message);
        default:
          throw new Error(`unexpected log level ${level}`);
      }
    });
  }

  logger.info(
    logMessagePrefix + `${prevState.controlState} -> ${currState.controlState}. took: ${tookMs}ms.`
  );
  logger.debug<StateTransitionLogMeta>(
    logMessagePrefix + `${prevState.controlState} -> ${currState.controlState}. took: ${tookMs}ms.`,
    {
      kibana: {
        migrations: {
          state: currState,
          duration: tookMs,
        },
      },
    }
  );
};

export const logActionResponse = (
  logger: Logger,
  logMessagePrefix: string,
  state: LogAwareState,
  res: unknown
) => {
  logger.debug(logMessagePrefix + `${state.controlState} RESPONSE`, res as LogMeta);
};
