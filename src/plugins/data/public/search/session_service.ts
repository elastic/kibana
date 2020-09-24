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

import uuid from 'uuid';
import { ISessionService, IEsSearchRequest, createRequestHash } from '../../common/search';

export enum SearchStatus {
  Running,
  Done,
  Error,
  Timeout,
  Expired,
  Canceled,
}

interface RequestInfo {
  searchId?: string;
  status: SearchStatus;
}

interface SessionInfo {
  requests: Record<string, RequestInfo>;
  status: SearchStatus;
}
export class SessionService implements ISessionService {
  private sessionId?: string;
  private isRestore!: boolean;
  protected isStored!: boolean;
  private readonly idMapping: Map<string, SessionInfo>;

  constructor() {
    this.idMapping = new Map();
    this.start();
  }

  public trackSearch(request: IEsSearchRequest, sessionId: string | undefined) {
    if (sessionId && request.params && request.params.body) {
      let sessionInfo = this.idMapping.get(sessionId);

      // Create session info for a new session
      if (!sessionInfo) {
        sessionInfo = {
          requests: {},
          status: SearchStatus.Running,
        };
        this.idMapping.set(sessionId, sessionInfo);
      }

      // Reopen a complete session, if a new search is run. We know this can happen because of follow up requests.
      if (sessionInfo.status === SearchStatus.Done) {
        sessionInfo.status = SearchStatus.Running;
      }

      // Add request info to the session
      sessionInfo.requests[createRequestHash(request.params.body)] = {
        status: SearchStatus.Running,
      };
    }
  }

  public trackSearchId(request: IEsSearchRequest, sessionId: string | undefined, searchId: string) {
    if (sessionId && request.params && request.params.body) {
      const sessionInfo = this.idMapping.get(sessionId);
      if (sessionInfo) {
        const requestInfo = sessionInfo.requests[createRequestHash(request.params.body)];
        if (requestInfo) {
          requestInfo.searchId = searchId;
        }
      }
    }
  }

  public trackSearchComplete(request: IEsSearchRequest, sessionId?: string) {
    if (sessionId && request.params && request.params.body) {
      const sessionInfo = this.idMapping.get(sessionId);
      sessionInfo!.requests[createRequestHash(request.params.body)].status = SearchStatus.Done;

      // Mark session as done, if all requests are done
      Object.values(sessionInfo!.requests)
        .map((requestInfo) => requestInfo.status === SearchStatus.Done)
        .every(() => {
          sessionInfo!.status = SearchStatus.Done;
        });
    }
  }

  public trackSearchError(request: IEsSearchRequest, sessionId?: string) {
    if (sessionId && request.params && request.params.body) {
      const sessionInfo = this.idMapping.get(sessionId);

      if (sessionInfo) {
        // Mark request as errored, don't update session status
        sessionInfo.requests[createRequestHash(request.params.body)].status = SearchStatus.Error;
      }
    }
  }

  public get() {
    return this.sessionId;
  }

  public isRestoredSession() {
    return this.isRestore;
  }

  public getStored() {
    return this.isStored;
  }

  public restore(sessionId: string) {
    this.sessionId = sessionId;
    this.isRestore = true;
    this.isStored = true;
  }

  public start() {
    this.sessionId = uuid.v4();
    this.isRestore = false;
    this.isStored = false;
    return this.sessionId;
  }

  public clear() {
    this.sessionId = undefined;
    this.isRestore = false;
    this.isStored = false;
  }
}
