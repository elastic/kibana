/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { QueryState } from '@kbn/data-plugin/common';
import type { IKbnUrlStateStorage } from '@kbn/kibana-utils-plugin/public';

export interface DiscoverGlobalStateContainer {
  get: () => QueryState | null;
  set: (state: QueryState) => Promise<void>;
}

const GLOBAL_STATE_URL_KEY = '_g';

export const getDiscoverGlobalStateContainer = (
  stateStorage: IKbnUrlStateStorage
): DiscoverGlobalStateContainer => ({
  get: () => stateStorage.get<QueryState>(GLOBAL_STATE_URL_KEY),
  set: async (state: QueryState) => {
    await stateStorage.set(GLOBAL_STATE_URL_KEY, state, { replace: true });
  },
});
