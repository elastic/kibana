/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import rison from '@kbn/rison';
import { encodeState } from '../../../common/state_management/encode_state';
import { isStateHash } from '../../../common/state_management/state_hash';
import { retrieveState, persistState } from '../state_hash';

// should be:
// export function decodeState<State extends RisonValue>(expandedOrHashedState: string)
// but this leads to the chain of types mismatches up to BaseStateContainer interfaces,
// as in state containers we don't have any restrictions on state shape
export function decodeState<State>(expandedOrHashedState: string): State {
  if (isStateHash(expandedOrHashedState)) {
    return retrieveState(expandedOrHashedState);
  } else {
    return rison.decode(expandedOrHashedState) as unknown as State;
  }
}

export function hashedStateToExpandedState(expandedOrHashedState: string): string {
  if (isStateHash(expandedOrHashedState)) {
    return encodeState(retrieveState(expandedOrHashedState), false, persistState);
  }

  return expandedOrHashedState;
}

export function expandedStateToHashedState(expandedOrHashedState: string): string {
  if (isStateHash(expandedOrHashedState)) {
    return expandedOrHashedState;
  }

  return persistState(decodeState(expandedOrHashedState));
}
