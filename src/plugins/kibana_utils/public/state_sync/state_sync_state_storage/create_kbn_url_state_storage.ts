/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Observable, of } from 'rxjs';
import { catchError, map, share } from 'rxjs/operators';
import { History } from 'history';
import { IStateStorage } from './types';
import {
  createKbnUrlControls,
  getStateFromKbnUrl,
  IKbnUrlControls,
  setStateToKbnUrl,
} from '../../state_management/url';

/**
 * KbnUrlStateStorage is a state storage for {@link syncState} utility which:
 *
 * 1. Keeps state in sync with the URL.
 * 2. Serializes data and stores it in the URL in one of the supported formats:
 *   * Rison encoded.
 *   * Hashed URL: In URL we store only the hash from the serialized state, but the state itself is stored in sessionStorage. See Kibana's `state:storeInSessionStorage` advanced option for more context.
 * 3. Takes care of listening to the URL updates and notifies state about the updates.
 * 4. Takes care of batching URL updates to prevent redundant browser history records.
 *
 * {@link https://github.com/elastic/kibana/blob/main/src/plugins/kibana_utils/docs/state_sync/storages/kbn_url_storage.md | Refer to this guide for more info}
 * @public
 */
export interface IKbnUrlStateStorage extends IStateStorage {
  set: <State>(
    key: string,
    state: State,
    opts?: { replace: boolean }
  ) => Promise<string | undefined>;
  get: <State = unknown>(key: string) => State | null;
  change$: <State = unknown>(key: string) => Observable<State | null>;

  /**
   * Cancels any pending url updates
   */
  cancel: () => void;

  /**
   * Lower level wrapper around history library that handles batching multiple URL updates into one history change
   */
  kbnUrlControls: IKbnUrlControls;
}

/**
 * Creates {@link IKbnUrlStateStorage} state storage
 * @returns - {@link IKbnUrlStateStorage}
 * @public
 */
export const createKbnUrlStateStorage = (
  {
    useHash = false,
    useHashQuery = true,
    history,
    onGetError,
    onSetError,
  }: {
    useHash: boolean;
    useHashQuery?: boolean;
    history?: History;
    onGetError?: (error: Error) => void;
    onSetError?: (error: Error) => void;
  } = {
    useHash: false,
    useHashQuery: true,
  }
): IKbnUrlStateStorage => {
  const url = createKbnUrlControls(history);
  return {
    set: <State>(
      key: string,
      state: State,
      { replace = false }: { replace: boolean } = { replace: false }
    ) => {
      // syncState() utils doesn't wait for this promise
      return url.updateAsync((currentUrl) => {
        try {
          return setStateToKbnUrl(
            key,
            state,
            { useHash, storeInHashQuery: useHashQuery },
            currentUrl
          );
        } catch (error) {
          if (onSetError) onSetError(error);
        }
      }, replace);
    },
    get: (key) => {
      // if there is a pending url update, then state will be extracted from that pending url,
      // otherwise current url will be used to retrieve state from
      try {
        return getStateFromKbnUrl(key, url.getPendingUrl(), { getFromHashQuery: useHashQuery });
      } catch (e) {
        if (onGetError) onGetError(e);
        return null;
      }
    },
    change$: <State>(key: string) =>
      new Observable((observer) => {
        const unlisten = url.listen(() => {
          observer.next();
        });

        return () => {
          unlisten();
        };
      }).pipe(
        map(() => getStateFromKbnUrl<State>(key, undefined, { getFromHashQuery: useHashQuery })),
        catchError((error) => {
          if (onGetError) onGetError(error);
          return of(null);
        }),
        share()
      ),
    cancel() {
      url.cancel();
    },
    kbnUrlControls: url,
  };
};
