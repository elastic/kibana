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
import {
  ISessionService,
  IEsSearchRequest,
  createRequestHash,
  SearchStatus,
  SessionStatus,
} from '../../common/search';
import { SearchTimeoutError } from '.';

interface RequestInfo {
  searchId?: string;
  status: SearchStatus;
}

interface SessionInfo {
  requests: Record<string, RequestInfo>;
  status: SessionStatus;
  timeoutNotified: boolean;
}
export class SessionService implements ISessionService {
  private sessionId?: string;
  private readonly idMapping: Map<string, SessionInfo>;

  constructor() {
    this.idMapping = new Map();
    this.start();
  }

  public trackSearch(request: IEsSearchRequest, sessionId: string | undefined) {
    if (sessionId && request.params && request.params.body) {
      const sessionInfo = this.idMapping.get(sessionId);

      // Mark a session as running.
      // Also reopen a complete session, if a new search is run. We know this can happen because of follow up requests.
      if (
        sessionInfo!.status === SessionStatus.New ||
        sessionInfo!.status === SessionStatus.Completed
      ) {
        sessionInfo!.status = SessionStatus.Running;
      }

      // Add request info to the session
      sessionInfo!.requests[createRequestHash(request.params.body)] = {
        status: SearchStatus.Running,
      };
    }
  }

  public trackSearchId(request: IEsSearchRequest, sessionId: string | undefined, searchId: string) {
    if (sessionId && request.params && request.params.body) {
      const sessionInfo = this.idMapping.get(sessionId);
      const requestInfo = sessionInfo!.requests[createRequestHash(request.params.body)];
      if (requestInfo) {
        requestInfo.searchId = searchId;
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
          sessionInfo!.status = SessionStatus.Completed;
        });
    }
  }

  public trackSearchError(request: IEsSearchRequest, sessionId?: string, e?: Error) {
    if (sessionId && request.params && request.params.body) {
      const sessionInfo = this.idMapping.get(sessionId);

      // Mark request as errored, don't update session status
      if (e instanceof SearchTimeoutError) {
        sessionInfo!.status = SessionStatus.Timeout;
      }
      sessionInfo!.requests[createRequestHash(request.params.body)].status = SearchStatus.Error;
    }
  }

  public getSessionId() {
    return this.sessionId;
  }

  public getSessionTimeoutNotified(): boolean {
    if (this.sessionId) {
      const sessionInfo = this.idMapping.get(this.sessionId);
      return sessionInfo!.timeoutNotified;
    } else {
      return false;
    }
  }

  public setSessionTimeoutNotified() {
    if (this.sessionId) {
      const sessionInfo = this.idMapping.get(this.sessionId);
      sessionInfo!.timeoutNotified = true;
    }
  }

  public start() {
    this.sessionId = uuid.v4();

    const sessionInfo = {
      requests: {},
      status: SessionStatus.New,
      timeoutNotified: false,
    };
    this.idMapping.set(this.sessionId, sessionInfo);

    return this.sessionId;
  }

  public clear() {
    this.sessionId = undefined;
  }
}
