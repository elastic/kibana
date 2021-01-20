/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { Defer } from '../../../kibana_utils/public';

export interface BatchItem<Payload, Result> {
  payload: Payload;
  future: Defer<Result>;
  signal?: AbortSignal;
}

export type BatchedFunc<Payload, Result> = (
  payload: Payload,
  signal?: AbortSignal
) => Promise<Result>;
