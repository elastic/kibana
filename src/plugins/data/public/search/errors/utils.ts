/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { IEsError } from './types';

export function getFailedShards(err: IEsError) {
  const failedShards =
    err.body?.attributes?.error?.failed_shards ||
    err.body?.attributes?.error?.caused_by?.failed_shards;
  return failedShards ? failedShards[0] : undefined;
}

export function getTopLevelCause(err: IEsError) {
  return err.body?.attributes?.error;
}

export function getRootCause(err: IEsError) {
  return getFailedShards(err)?.reason;
}
