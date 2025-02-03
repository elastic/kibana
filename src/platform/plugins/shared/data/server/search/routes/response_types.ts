/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { SerializableRecord } from '@kbn/utility-types';

interface SearchSessionAttrRestResponse {
  sessionId: string;
  name?: string;
  appId?: string;
  created: string;
  expires: string;
  locatorId?: string;
  initialState?: SerializableRecord;
  restoreState?: SerializableRecord;
  idMapping: Record<string, SearchSessionRequestInfoRestResponse>;
  realmType?: string;
  realmName?: string;
  username?: string;
  version: string;
  isCanceled?: boolean;
}

interface SearchSessionRequestInfoRestResponse {
  id: string;
  strategy: string;
}

export interface SearchSessionRestResponse {
  id: string;
  attributes: SearchSessionAttrRestResponse;
}

export interface SearchSessionStatusRestResponse {
  status: StatusRestRespone;
  errors?: string[];
}

type StatusRestRespone = 'in_progress' | 'error' | 'complete' | 'cancelled' | 'expired';

export interface SearchSessionsFindRestResponse {
  saved_objects: SearchSessionRestResponse[];
  total: number;
  /**
   * Map containing calculated statuses of search sessions from the find response
   */
  statuses: Record<string, SearchSessionStatusRestResponse>;
}

export interface SearchSessionsUpdateRestResponse {
  id: string;
  type: string;
  updated_at?: string;
  version?: string;
  namespaces?: string[];
  references?: Array<{ id: string; type: string; name: string }>;
  attributes: {
    name?: string;
    expires?: string;
  };
}
