/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { PublicContract } from '@kbn/utility-types';
import { HttpSetup } from '@kbn/core/public';
import type {
  SavedObject,
  SavedObjectsUpdateResponse,
  SavedObjectsFindOptions,
} from '@kbn/core/server';
import type {
  SearchSessionSavedObjectAttributes,
  SearchSessionsFindResponse,
} from '../../../common';
export type SearchSessionSavedObject = SavedObject<SearchSessionSavedObjectAttributes>;
export type ISessionsClient = PublicContract<SessionsClient>;
export interface SessionsClientDeps {
  http: HttpSetup;
}

const version = '1';
const options = { version };

/**
 * CRUD Search Session SO
 */
export class SessionsClient {
  private readonly http: HttpSetup;

  constructor(deps: SessionsClientDeps) {
    this.http = deps.http;
  }

  public get(sessionId: string): Promise<SearchSessionSavedObject> {
    return this.http.get(`/internal/session/${encodeURIComponent(sessionId)}`, options);
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
      version,
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

  public find(opts: Omit<SavedObjectsFindOptions, 'type'>): Promise<SearchSessionsFindResponse> {
    return this.http!.post(`/internal/session/_find`, {
      version,
      body: JSON.stringify(opts),
    });
  }

  public update(
    sessionId: string,
    attributes: unknown
  ): Promise<SavedObjectsUpdateResponse<SearchSessionSavedObjectAttributes>> {
    return this.http!.put(`/internal/session/${encodeURIComponent(sessionId)}`, {
      version,
      body: JSON.stringify(attributes),
    });
  }

  public async rename(sessionId: string, newName: string): Promise<void> {
    await this.update(sessionId, { name: newName });
  }

  public async extend(sessionId: string, expires: string): Promise<void> {
    await this.http!.post(`/internal/session/${encodeURIComponent(sessionId)}/_extend`, {
      version,
      body: JSON.stringify({ expires }),
    });
  }

  public delete(sessionId: string): Promise<void> {
    return this.http!.delete(`/internal/session/${encodeURIComponent(sessionId)}`, options);
  }
}
