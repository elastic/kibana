/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { SharePluginStart } from '@kbn/share-plugin/public';
import type { SearchSessionSavedObjectAttributes, SearchSessionStatus } from '../../../../common';

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

export enum ACTION {
  INSPECT = 'inspect',
  EXTEND = 'extend',
  DELETE = 'delete',
  RENAME = 'rename',
}

export interface UISession {
  id: string;
  name: string;
  appId: string;
  created: string;
  expires: string | null;
  status: UISearchSessionState;
  idMapping: SearchSessionSavedObjectAttributes['idMapping'];
  numSearches: number;
  actions?: ACTION[];
  reloadUrl: string;
  restoreUrl: string;
  initialState: Record<string, unknown>;
  restoreState: Record<string, unknown>;
  version: string;
  errors?: string[];
}

export type LocatorsStart = SharePluginStart['url']['locators'];

export interface SearchSessionSavedObject {
  id: string;
  attributes: PersistedSearchSessionSavedObjectAttributes;
}

export type BackgroundSearchOpenedHandler = (attrs: {
  session: UISession;
  event: React.MouseEvent<HTMLAnchorElement>;
}) => void;
