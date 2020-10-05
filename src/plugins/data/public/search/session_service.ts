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
  sessionId: string;
  requests: Record<string, RequestInfo>;
  status: SessionStatus;
}
export class SessionService implements ISessionService {
  private activeSession?: SessionInfo;

  constructor() {
    this.start();
  }

  public trackSearch(request: IEsSearchRequest, sessionId: string | undefined) {
    if (sessionId && request.params && request.params.body && this.activeSession) {
      const sessionInfo = this.activeSession;

      // Mark a session as running.
      // Also reopen a complete session, if a new search is run. We know this can happen because of follow up requests.
      if (
        sessionInfo.status === SessionStatus.NEW ||
        sessionInfo.status === SessionStatus.COMPLETED
      ) {
        sessionInfo.status = SessionStatus.RUNNING;
      }

      // Add request info to the session
      sessionInfo.requests[createRequestHash(request.params.body)] = {
        status: SearchStatus.RUNNING,
      };
    }
  }

  public trackSearchId(request: IEsSearchRequest, sessionId: string | undefined, searchId: string) {
    if (sessionId && request.params && request.params.body && this.activeSession) {
      const requestInfo = this.activeSession.requests[createRequestHash(request.params.body)];
      if (requestInfo) {
        requestInfo.searchId = searchId;
      }
    }
  }

  public trackSearchComplete(request: IEsSearchRequest, sessionId?: string) {
    if (sessionId && request.params && request.params.body && this.activeSession) {
      this.activeSession.requests[createRequestHash(request.params.body)].status =
        SearchStatus.DONE;

      // Mark session as done, if all requests are done
      Object.values(this.activeSession!.requests)
        .map((requestInfo) => requestInfo.status === SearchStatus.DONE)
        .every(() => {
          this.activeSession!.status = SessionStatus.COMPLETED;
        });
    }
  }

  public trackSearchError(request: IEsSearchRequest, sessionId?: string, e?: Error) {
    if (sessionId && request.params && request.params.body && this.activeSession) {
      // Mark request as errored, don't update session status
      if (e instanceof SearchTimeoutError) {
        this.activeSession.status = SessionStatus.TIMEOUT;
      }
      this.activeSession.requests[createRequestHash(request.params.body)].status =
        SearchStatus.ERROR;
    }
  }

  public getSessionId() {
    return this.activeSession?.sessionId;
  }

  public start() {
    this.activeSession = {
      sessionId: uuid.v4(),
      status: SessionStatus.NEW,
      requests: {},
    };

    return this.activeSession.sessionId;
  }

  public clear() {
    this.activeSession = undefined;
  }
}
