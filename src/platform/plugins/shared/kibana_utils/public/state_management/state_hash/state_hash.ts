/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';
import { createStateHash } from '../../../common/state_management/state_hash';
import { hashedItemStore } from '../../storage/hashed_item_store';

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
  const hash = createStateHash(json, hashedItemStore.getItem.bind(hashedItemStore));

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
