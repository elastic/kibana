/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { SearchSessionSavedObjectAttributes, SearchSessionStatus } from '../../../../common';
import { ACTION } from './components/actions';

export const DATE_STRING_FORMAT = 'D MMM, YYYY, HH:mm:ss';

/**
 * Some properties are optional for a non-persisted Search Session.
 * This interface makes them mandatory, because management only shows persisted search sessions.
 */
export type PersistedSearchSessionSavedObjectAttributes = SearchSessionSavedObjectAttributes &
  Required<
    Pick<
      SearchSessionSavedObjectAttributes,
      'name' | 'appId' | 'locatorId' | 'initialState' | 'restoreState'
    >
  >;

export type UISearchSessionState = SearchSessionStatus;

export interface UISession {
  id: string;
  name: string;
  appId: string;
  created: string;
  expires: string | null;
  status: UISearchSessionState;
  numSearches: number;
  actions?: ACTION[];
  reloadUrl: string;
  restoreUrl: string;
  initialState: Record<string, unknown>;
  restoreState: Record<string, unknown>;
  version: string;
}
