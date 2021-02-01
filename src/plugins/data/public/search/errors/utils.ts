/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { FailedShard } from './types';
import { KibanaServerError } from '../../../../kibana_utils/common';

export function getFailedShards(err: KibanaServerError<any>): FailedShard | undefined {
  const errorInfo = err.attributes;
  const failedShards = errorInfo?.failed_shards || errorInfo?.caused_by?.failed_shards;
  return failedShards ? failedShards[0] : undefined;
}

export function getRootCause(err: KibanaServerError) {
  return getFailedShards(err)?.reason;
}
