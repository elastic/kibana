/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import { Sha256 } from '@kbn/core/public/utils';
import { hashedItemStore } from '../../storage/hashed_item_store';

// This prefix is used to identify hash strings that have been encoded in the URL.
const HASH_PREFIX = 'h@';

export function createStateHash(
  json: string,
  existingJsonProvider?: (hash: string) => string | null // TODO: temp while state.js relies on this in tests
) {
  if (typeof json !== 'string') {
    throw new Error('createHash only accepts strings (JSON).');
  }

  const hash = new Sha256().update(json, 'utf8').digest('hex');

  let shortenedHash;

  // Shorten the hash to at minimum 7 characters. We just need to make sure that it either:
  // a) hasn't been used yet
  // b) or has been used already, but with the JSON we're currently hashing.
  for (let i = 7; i < hash.length; i++) {
    shortenedHash = hash.slice(0, i);
    const existingJson = existingJsonProvider
      ? existingJsonProvider(shortenedHash)
      : hashedItemStore.getItem(shortenedHash);
    if (existingJson === null || existingJson === json) break;
  }

  return `${HASH_PREFIX}${shortenedHash}`;
}

export function isStateHash(str: string) {
  return String(str).indexOf(HASH_PREFIX) === 0;
}

export function retrieveState<State>(stateHash: string): State {
  const json = hashedItemStore.getItem(stateHash);
  const throwUnableToRestoreUrlError = () => {
    throw new Error(
      i18n.translate('kibana_utils.stateManagement.stateHash.unableToRestoreUrlErrorMessage', {
        defaultMessage:
          'Unable to completely restore the URL, be sure to use the share functionality.',
      })
    );
  };
  if (json === null) {
    return throwUnableToRestoreUrlError();
  }
  try {
    return JSON.parse(json);
  } catch (e) {
    return throwUnableToRestoreUrlError();
  }
}

export function persistState<State>(state: State): string {
  const json = JSON.stringify(state);
  const hash = createStateHash(json);

  const isItemSet = hashedItemStore.setItem(hash, json);
  if (isItemSet) return hash;
  // If we ran out of space trying to persist the state, notify the user.
  const message = i18n.translate(
    'kibana_utils.stateManagement.stateHash.unableToStoreHistoryInSessionErrorMessage',
    {
      defaultMessage:
        'Kibana is unable to store history items in your session ' +
        `because it is full and there don't seem to be items any items safe ` +
        'to delete.\n\n' +
        'This can usually be fixed by moving to a fresh tab, but could ' +
        'be caused by a larger issue. If you are seeing this message regularly, ' +
        'please file an issue at {gitHubIssuesUrl}.',
      values: { gitHubIssuesUrl: 'https://github.com/elastic/kibana/issues' },
    }
  );
  throw new Error(message);
}
