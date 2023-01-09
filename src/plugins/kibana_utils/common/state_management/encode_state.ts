/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import rison from '@kbn/rison';

// should be:
// export function encodeState<State extends RisonValue> but this leads to the chain of
// types mismatches up to BaseStateContainer interfaces, as in state containers we don't
// have any restrictions on state shape
export function encodeState<State>(
  state: State,
  useHash: boolean,
  createHash: (rawState: State) => string
): string {
  if (useHash) {
    return createHash(state);
  } else {
    return rison.encodeUnknown(state) ?? '';
  }
}
