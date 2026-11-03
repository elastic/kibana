/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { SharePluginStart } from '@kbn/share-plugin/public';
import type {
  PersistedSearchSessionSavedObjectAttributes,
  UISession,
} from '@kbn/data-plugin/public';

export { SEARCH_SESSION_ACTION as ACTION } from '@kbn/data-plugin/public';
export type {
  PersistedSearchSessionSavedObjectAttributes,
  UISearchSessionState,
  UISession,
} from '@kbn/data-plugin/public';

export const DATE_STRING_FORMAT = 'D MMM, YYYY, HH:mm:ss';

export type LocatorsStart = SharePluginStart['url']['locators'];

export interface SearchSessionSavedObject {
  id: string;
  attributes: PersistedSearchSessionSavedObjectAttributes;
}

export type BackgroundSearchOpenedHandler = (attrs: {
  session: UISession;
  event: React.MouseEvent<HTMLAnchorElement>;
}) => void;
