/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { CaseStatuses } from '@kbn/cases-components';
import { HttpStart } from '@kbn/core-http-browser';

const INTERNAL_BULK_GET_CASES_URL = '/internal/cases/_bulk_get';

export interface Case {
  title: string;
  description: string;
  status: CaseStatuses;
  totalComment: number;
  created_at: string;
  created_by: {
    email: string | null | undefined;
    full_name: string | null | undefined;
    username: string | null | undefined;
  };
  id: string;
  owner: string;
  version: string;
}

export type Cases = Case[];

export interface CasesBulkGetResponse {
  cases: Cases;
  errors: Array<{
    caseId: string;
    error: string;
    message: string;
    status?: number;
  }>;
}

export const bulkGetCases = (http: HttpStart, params: { ids: string[] }, signal?: AbortSignal) => {
  return http.post<CasesBulkGetResponse>(INTERNAL_BULK_GET_CASES_URL, {
    body: JSON.stringify({ ...params }),
    signal,
  });
};
