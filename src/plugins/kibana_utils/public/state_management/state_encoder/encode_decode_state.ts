/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import rison, { RisonValue } from 'rison-node';
import { isStateHash, retrieveState, persistState } from '../state_hash';

// should be:
// export function decodeState<State extends RisonValue>(expandedOrHashedState: string)
// but this leads to the chain of types mismatches up to BaseStateContainer interfaces,
// as in state containers we don't have any restrictions on state shape
export function decodeState<State>(expandedOrHashedState: string): State {
  if (isStateHash(expandedOrHashedState)) {
    return retrieveState(expandedOrHashedState);
  } else {
    return (rison.decode(expandedOrHashedState) as unknown) as State;
  }
}

// should be:
// export function encodeState<State extends RisonValue>(expandedOrHashedState: string)
// but this leads to the chain of types mismatches up to BaseStateContainer interfaces,
// as in state containers we don't have any restrictions on state shape
export function encodeState<State>(state: State, useHash: boolean): string {
  if (useHash) {
    return persistState(state);
  } else {
    return rison.encode((state as unknown) as RisonValue);
  }
}

export function hashedStateToExpandedState(expandedOrHashedState: string): string {
  if (isStateHash(expandedOrHashedState)) {
    return encodeState(retrieveState(expandedOrHashedState), false);
  }

  return expandedOrHashedState;
}

export function expandedStateToHashedState(expandedOrHashedState: string): string {
  if (isStateHash(expandedOrHashedState)) {
    return expandedOrHashedState;
  }

  return persistState(decodeState(expandedOrHashedState));
}
