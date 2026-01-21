/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { SerializableRecord } from '@kbn/utility-types';
import type { SearchSessionsFindResponse } from '../../../../../../../common';
import type { ACTION, LocatorsStart, SearchSessionSavedObject, UISession } from '../../../types';
import { getActions } from './get_actions';

function getUrlFromState(locators: LocatorsStart, locatorId: string, state: SerializableRecord) {
  try {
    const locator = locators.get(locatorId);
    return locator?.getRedirectUrl(state);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Could not create URL from restoreState');
    // eslint-disable-next-line no-console
    console.error(err);
  }
}

// Helper: factory for a function to map server objects to UI objects
export const mapToUISession = ({
  savedObject,
  locators,
  sessionStatuses,
  actions: filteredActions,
}: {
  savedObject: SearchSessionSavedObject;
  locators: LocatorsStart;
  sessionStatuses: SearchSessionsFindResponse['statuses'];
  actions?: ACTION[];
}): UISession => {
  const {
    name,
    appId,
    created,
    expires,
    locatorId,
    initialState,
    restoreState,
    idMapping,
    version,
  } = savedObject.attributes;

  const status = sessionStatuses[savedObject.id]?.status;
  const errors = sessionStatuses[savedObject.id]?.errors;
  const actions = getActions(status).filter((action) => {
    if (!filteredActions?.length) return true; // if no actions are provided, return all
    return filteredActions.includes(action);
  });

  // TODO: initialState should be saved without the searchSessionID
  if (initialState) delete initialState.searchSessionId;
  // derive the URL and add it in
  const reloadUrl = getUrlFromState(locators, locatorId, initialState);
  const restoreUrl = getUrlFromState(locators, locatorId, {
    ...restoreState,
    tab: { id: 'new', label: name },
  });

  return {
    id: savedObject.id,
    name,
    appId,
    created,
    expires,
    status,
    actions,
    restoreUrl: restoreUrl!,
    reloadUrl: reloadUrl!,
    initialState,
    restoreState,
    idMapping,
    numSearches: Object.keys(idMapping).length,
    version,
    errors,
  };
};
