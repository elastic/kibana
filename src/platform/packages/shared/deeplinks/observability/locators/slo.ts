/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Filter } from '@kbn/es-query';
import type { SerializableRecord } from '@kbn/utility-types';

export const sloDetailsLocatorID = 'SLO_DETAILS_LOCATOR';
export const sloDetailsHistoryLocatorID = 'SLO_DETAILS_HISTORY_LOCATOR';
export const sloEditLocatorID = 'SLO_EDIT_LOCATOR';
export const sloListLocatorID = 'SLO_LIST_LOCATOR';

export const OVERVIEW_TAB_ID = 'overview';
export const HISTORY_TAB_ID = 'history';
export const DEFINITION_TAB_ID = 'definition';
export const ALERTS_TAB_ID = 'alerts';

export type SloTabId =
  | typeof OVERVIEW_TAB_ID
  | typeof ALERTS_TAB_ID
  | typeof HISTORY_TAB_ID
  | typeof DEFINITION_TAB_ID;

export interface SloDetailsLocatorParams extends SerializableRecord {
  sloId: string;
  instanceId?: string;
  tabId?: SloTabId;
}

export interface SloDetailsHistoryLocatorParams extends SerializableRecord {
  id: string;
  instanceId?: string;
  encodedAppState?: string;
}

export interface SloListLocatorParams extends SerializableRecord {
  kqlQuery?: string;
  filters?: Filter[];
}
