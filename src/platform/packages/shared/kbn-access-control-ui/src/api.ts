/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { GeneralAccessLevel, Principal } from '@kbn/access-control';
import { buildPath, type HttpSetup } from '@kbn/core-http-browser';
import type {
  AccessChangeResponse,
  AccessDraft,
  AccessPolicyResponse,
  AccessStateResponse,
  SuggestedUser,
} from './types';

const BASE_PATH = '/internal/security/access_control';

export type AccessControlApi = ReturnType<typeof createAccessControlApi>;

/**
 * Client for the generic object-level access API. Every type with an access policy uses it.
 */
export const createAccessControlApi = (http: Pick<HttpSetup, 'get' | 'put' | 'post'>) => {
  const typePath = (type: string, action: string) =>
    buildPath(`${BASE_PATH}/{type}/${action}`, { type });
  const objectPath = (type: string, id: string, action = '') =>
    buildPath(`${BASE_PATH}/{type}/{id}${action}`, { type, id });

  return {
    getPolicy: (type: string) => http.get<AccessPolicyResponse>(typePath(type, '_policy')),

    get: (type: string, id: string) => http.get<AccessStateResponse>(objectPath(type, id)),

    replace: (type: string, id: string, version: string, draft: AccessDraft) =>
      http.put<AccessChangeResponse>(objectPath(type, id), {
        body: JSON.stringify({ version, ...draft }),
      }),

    claim: (type: string, id: string, version: string, generalAccess?: GeneralAccessLevel) =>
      http.post<AccessChangeResponse>(objectPath(type, id, '/_claim'), {
        body: JSON.stringify({ version, general_access: generalAccess }),
      }),

    transfer: (type: string, id: string, version: string, owner: Principal) =>
      http.post<AccessChangeResponse>(objectPath(type, id, '/_transfer'), {
        body: JSON.stringify({ version, owner }),
      }),

    suggest: async (type: string, name: string, signal?: AbortSignal) =>
      (
        await http.post<{ users: SuggestedUser[] }>(typePath(type, '_suggest_principals'), {
          body: JSON.stringify({ name, size: 20 }),
          signal,
        })
      ).users,
  };
};
