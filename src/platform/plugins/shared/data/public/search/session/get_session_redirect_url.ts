/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { SerializableRecord } from '@kbn/utility-types';
import type { LocatorsStart } from './sessions_mgmt/types';

interface GetRedirectUrlFromStateParams {
  locators: LocatorsStart;
  locatorId?: string;
  state?: SerializableRecord;
}

export const getRedirectUrlFromState = ({
  locators,
  locatorId,
  state,
}: GetRedirectUrlFromStateParams): string | undefined => {
  if (!locatorId || !state) return;

  try {
    const locator = locators.get(locatorId);
    return locator?.getRedirectUrl(state);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Could not create URL from restoreState');
    // eslint-disable-next-line no-console
    console.error(err);
  }
};

interface GetRestoreUrlParams {
  locators: LocatorsStart;
  locatorId?: string;
  restoreState?: SerializableRecord;
  sessionName?: string;
}

export const getRestoreUrl = ({
  locators,
  locatorId,
  restoreState,
  sessionName,
}: GetRestoreUrlParams): string | undefined =>
  getRedirectUrlFromState({
    locators,
    locatorId,
    state: restoreState
      ? {
          ...restoreState,
          tab: { id: 'new', label: sessionName },
        }
      : undefined,
  });
