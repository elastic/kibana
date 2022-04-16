/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { timer } from 'rxjs';
import { Logger, ISavedObjectsRepository } from '@kbn/core/server';
import { ROLL_INDICES_INTERVAL, ROLL_INDICES_START } from './constants';
import { rollUsageCountersIndices } from './rollups';

export function registerUsageCountersRollups(
  logger: Logger,
  getSavedObjectsClient: () => ISavedObjectsRepository | undefined
) {
  timer(ROLL_INDICES_START, ROLL_INDICES_INTERVAL).subscribe(() =>
    rollUsageCountersIndices(logger, getSavedObjectsClient())
  );
}
