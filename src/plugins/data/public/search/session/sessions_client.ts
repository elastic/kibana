/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { PublicContract } from '@kbn/utility-types';
import { HttpSetup, SavedObjectsFindOptions } from 'kibana/public';
import type { SavedObject, SavedObjectsFindResponse } from 'kibana/server';

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

  public get(sessionId: string): Promise<SavedObject> {
    return this.http.get(`/internal/session/${encodeURIComponent(sessionId)}`);
  }

  public create({
    name,
    appId,
    urlGeneratorId,
    initialState,
    restoreState,
    sessionId,
  }: {
    name: string;
    appId: string;
    initialState: Record<string, unknown>;
    restoreState: Record<string, unknown>;
    urlGeneratorId: string;
    sessionId: string;
  }): Promise<SavedObject> {
    return this.http.post(`/internal/session`, {
      body: JSON.stringify({
        name,
        initialState,
        restoreState,
        sessionId,
        appId,
        urlGeneratorId,
      }),
    });
  }

  public find(options: SavedObjectsFindOptions): Promise<SavedObjectsFindResponse> {
    return this.http!.post(`/internal/session`, {
      body: JSON.stringify(options),
    });
  }

  public update(sessionId: string, attributes: unknown): Promise<SavedObject> {
    return this.http!.put(`/internal/session/${encodeURIComponent(sessionId)}`, {
      body: JSON.stringify(attributes),
    });
  }

  public delete(sessionId: string): Promise<void> {
    return this.http!.delete(`/internal/session/${encodeURIComponent(sessionId)}`);
  }
}
