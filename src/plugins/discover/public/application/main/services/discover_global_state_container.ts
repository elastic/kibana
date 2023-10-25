/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { QueryState } from '@kbn/data-plugin/common';
import type { IKbnUrlStateStorage } from '@kbn/kibana-utils-plugin/public';
import type { DiscoverServices } from '../../../build_services';

export interface DiscoverGlobalStateContainer {
  get: () => QueryState | null;
  set: (state: QueryState) => Promise<void>;
}

const GLOBAL_STATE_URL_KEY = '_g';

export const getDiscoverGlobalStateContainer = (
  stateStorage: IKbnUrlStateStorage,
  services: DiscoverServices
): DiscoverGlobalStateContainer => {
  const get = () => {
    const state = stateStorage.get<QueryState>(GLOBAL_STATE_URL_KEY);
    const globalFilters = services.filterManager.getGlobalFilters();
    if (state && Object.keys(state).length === 0 && globalFilters?.length) {
      // taking care of the case when users navigate from Dashboard/Lens to Discover, and the filter is not in URL
      // but in the filterManager. this makes sure it's considered when updating the seach source
      return { filters: globalFilters };
    } else {
      return state;
    }
  };
  const set = async (state: QueryState) => {
    await stateStorage.set(GLOBAL_STATE_URL_KEY, state, { replace: true });
  };

  return {
    get,
    set,
  };
};
