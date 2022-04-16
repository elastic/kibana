/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Subject, timer } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { Logger, ISavedObjectsRepository } from '@kbn/core/server';
import { ROLL_INDICES_INTERVAL, ROLL_INDICES_START } from './constants';
import { rollUiCounterIndices } from './rollups';

export function registerUiCountersRollups(
  logger: Logger,
  stopRollingUiCounterIndicies$: Subject<void>,
  getSavedObjectsClient: () => ISavedObjectsRepository | undefined
) {
  timer(ROLL_INDICES_START, ROLL_INDICES_INTERVAL)
    .pipe(takeUntil(stopRollingUiCounterIndicies$))
    .subscribe(() =>
      rollUiCounterIndices(logger, stopRollingUiCounterIndicies$, getSavedObjectsClient())
    );
}
