/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { memoize } from 'lodash';
import type { KbnClient } from '@kbn/test';
import { catchAxiosErrorFormatAndThrow } from '../error';

/**
 * Calls the Fleet internal API to enable space awareness
 * @param kbnClient
 */
export const enableFleetSpaceAwareness = memoize(async (kbnClient: KbnClient): Promise<void> => {
  await kbnClient
    .request({
      path: '/internal/fleet/enable_space_awareness',
      headers: { 'Elastic-Api-Version': '1' },
      method: 'POST',
    })
    .catch(catchAxiosErrorFormatAndThrow);
});
