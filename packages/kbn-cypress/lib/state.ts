/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Event, pubsub } from './pubsub';

interface ExecutionState {
  cancellationReason: string | null;
}
const state: ExecutionState = {
  cancellationReason: null,
};

export const setCancellationReason = (reason: string) => {
  if (state.cancellationReason) {
    return;
  }
  state.cancellationReason = reason;
  pubsub.emit(Event.RUN_CANCELLED, reason);
};

export const getCancellationReason = () => state.cancellationReason;
