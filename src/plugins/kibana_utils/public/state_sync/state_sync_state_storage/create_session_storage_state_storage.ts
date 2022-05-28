/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { IStateStorage } from './types';

/**
 * {@link IStateStorage} for storing state in browser {@link Storage}
 * {@link https://github.com/elastic/kibana/blob/main/src/plugins/kibana_utils/docs/state_sync/storages/session_storage.md | guide}
 * @public
 */
export interface ISessionStorageStateStorage extends IStateStorage {
  set: <State>(key: string, state: State) => void;
  get: <State = unknown>(key: string) => State | null;
}

/**
 * Creates {@link ISessionStorageStateStorage}
 * {@link https://github.com/elastic/kibana/blob/main/src/plugins/kibana_utils/docs/state_sync/storages/session_storage.md | guide}
 * @param storage - Option {@link Storage} to use for storing state. By default window.sessionStorage.
 * @returns - {@link ISessionStorageStateStorage}
 * @public
 */
export const createSessionStorageStateStorage = (
  storage: Storage = window.sessionStorage
): ISessionStorageStateStorage => {
  return {
    set: <State>(key: string, state: State) => storage.setItem(key, JSON.stringify(state)),
    get: (key: string) => JSON.parse(storage.getItem(key)!),
  };
};
