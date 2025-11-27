/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { SerializableRecord } from '@kbn/utility-types';

export const sloDetailsLocatorID = 'SLO_DETAILS_LOCATOR';
export const sloDetailsHistoryLocatorID = 'SLO_DETAILS_HISTORY_LOCATOR';
export const sloEditLocatorID = 'SLO_EDIT_LOCATOR';
export const sloListLocatorID = 'SLO_LIST_LOCATOR';

export interface SloDetailsLocatorParams extends SerializableRecord {
  sloId?: string;
  instanceId?: string;
}

export interface SloDetailsHistoryLocatorParams extends SerializableRecord {
  id: string;
  instanceId?: string;
  encodedAppState?: string;
}

export interface SloListLocatorParams extends SerializableRecord {
  kqlQuery?: string;
}
