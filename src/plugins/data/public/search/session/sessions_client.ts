/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { PublicContract } from '@kbn/utility-types';
import { HttpSetup } from 'kibana/public';
import type { SavedObject, SavedObjectsFindResponse } from 'kibana/server';
import { BackgroundSessionSavedObjectAttributes, SearchSessionFindOptions } from '../../../common';

export type ISessionsClient = PublicContract<SessionsClient>;
export interface SessionsClientDeps {
  http: HttpSetup;
}

/**
 * CRUD backgroundSession SO
 */
export class SessionsClient {
  private readonly http: HttpSetup;

  constructor(deps: SessionsClientDeps) {
    this.http = deps.http;
  }

  public get(sessionId: string): Promise<SavedObject<BackgroundSessionSavedObjectAttributes>> {
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
  }): Promise<SavedObject<BackgroundSessionSavedObjectAttributes>> {
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

  public find(
    options: SearchSessionFindOptions
  ): Promise<SavedObjectsFindResponse<BackgroundSessionSavedObjectAttributes>> {
    return this.http!.post(`/internal/session`, {
      body: JSON.stringify(options),
    });
  }

  public update(
    sessionId: string,
    attributes: Partial<BackgroundSessionSavedObjectAttributes>
  ): Promise<SavedObject<BackgroundSessionSavedObjectAttributes>> {
    return this.http!.put(`/internal/session/${encodeURIComponent(sessionId)}`, {
      body: JSON.stringify(attributes),
    });
  }

  public delete(sessionId: string): Promise<void> {
    return this.http!.delete(`/internal/session/${encodeURIComponent(sessionId)}`);
  }
}
