/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { PublicContract } from '@kbn/utility-types';
import { HttpSetup, SavedObjectsFindOptions } from 'kibana/public';
import type {
  SavedObject,
  SavedObjectsFindResponse,
  SavedObjectsUpdateResponse,
} from 'kibana/server';
import type { SearchSessionSavedObjectAttributes } from '../../../common';
export type SearchSessionSavedObject = SavedObject<SearchSessionSavedObjectAttributes>;
export type ISessionsClient = PublicContract<SessionsClient>;
export interface SessionsClientDeps {
  http: HttpSetup;
}

/**
 * CRUD Search Session SO
 */
export class SessionsClient {
  private readonly http: HttpSetup;

  constructor(deps: SessionsClientDeps) {
    this.http = deps.http;
  }

  public get(sessionId: string): Promise<SearchSessionSavedObject> {
    return this.http.get(`/internal/session/${encodeURIComponent(sessionId)}`);
  }

  public create({
    name,
    appId,
    locatorId,
    initialState,
    restoreState,
    sessionId,
  }: {
    name: string;
    appId: string;
    locatorId: string;
    initialState: Record<string, unknown>;
    restoreState: Record<string, unknown>;
    sessionId: string;
  }): Promise<SearchSessionSavedObject> {
    return this.http.post(`/internal/session`, {
      body: JSON.stringify({
        name,
        appId,
        locatorId,
        initialState,
        restoreState,
        sessionId,
      }),
    });
  }

  public find(options: Omit<SavedObjectsFindOptions, 'type'>): Promise<SavedObjectsFindResponse> {
    return this.http!.post(`/internal/session/_find`, {
      body: JSON.stringify(options),
    });
  }

  public update(
    sessionId: string,
    attributes: unknown
  ): Promise<SavedObjectsUpdateResponse<SearchSessionSavedObjectAttributes>> {
    return this.http!.put(`/internal/session/${encodeURIComponent(sessionId)}`, {
      body: JSON.stringify(attributes),
    });
  }

  public rename(
    sessionId: string,
    newName: string
  ): Promise<SavedObjectsUpdateResponse<Pick<SearchSessionSavedObjectAttributes, 'name'>>> {
    return this.update(sessionId, { name: newName });
  }

  public extend(
    sessionId: string,
    expires: string
  ): Promise<SavedObjectsFindResponse<SearchSessionSavedObjectAttributes>> {
    return this.http!.post(`/internal/session/${encodeURIComponent(sessionId)}/_extend`, {
      body: JSON.stringify({ expires }),
    });
  }

  public delete(sessionId: string): Promise<void> {
    return this.http!.delete(`/internal/session/${encodeURIComponent(sessionId)}`);
  }
}
