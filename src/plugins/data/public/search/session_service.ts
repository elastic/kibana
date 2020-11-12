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
import { BehaviorSubject, Subscription } from 'rxjs';
import { HttpStart, PluginInitializerContext, StartServicesAccessor } from 'kibana/public';
import { ConfigSchema } from '../../config';
import {
  ISessionService,
  BackgroundSessionSavedObjectAttributes,
  SearchSessionFindOptions,
} from '../../common';

export class SessionService implements ISessionService {
  private session$ = new BehaviorSubject<string | undefined>(undefined);
  private get sessionId() {
    return this.session$.getValue();
  }
  private appChangeSubscription$?: Subscription;
  private curApp?: string;
  private http?: HttpStart;

  /**
   * Has the session already been stored (i.e. "sent to background")?
   */
  private _isStored: boolean = false;

  /**
   * Is this session a restored session (have these requests already been made, and we're just
   * looking to re-use the previous search IDs)?
   */
  private _isRestore: boolean = false;

  constructor(
    initializerContext: PluginInitializerContext<ConfigSchema>,
    getStartServices: StartServicesAccessor
  ) {
    /*
      Make sure that apps don't leave sessions open.
     */
    getStartServices().then(([coreStart]) => {
      this.http = coreStart.http;

      this.appChangeSubscription$ = coreStart.application.currentAppId$.subscribe((appName) => {
        if (this.sessionId) {
          const message = `Application '${this.curApp}' had an open session while navigating`;
          if (initializerContext.env.mode.dev) {
            // TODO: This setTimeout is necessary due to a race condition while navigating.
            setTimeout(() => {
              coreStart.fatalErrors.add(message);
            }, 100);
          } else {
            // eslint-disable-next-line no-console
            console.warn(message);
          }
        }
        this.curApp = appName;
      });
    });
  }

  public destroy() {
    this.appChangeSubscription$?.unsubscribe();
  }

  public getSessionId() {
    return this.sessionId;
  }

  public getSession$() {
    return this.session$.asObservable();
  }

  public isStored() {
    return this._isStored;
  }

  public isRestore() {
    return this._isRestore;
  }

  public start() {
    this._isStored = false;
    this._isRestore = false;
    this.session$.next(uuid.v4());
    return this.sessionId!;
  }

  public restore(sessionId: string) {
    this._isStored = true;
    this._isRestore = true;
    this.session$.next(sessionId);
    return this.http!.get(`/internal/session/${encodeURIComponent(sessionId)}`);
  }

  public clear() {
    this._isStored = false;
    this._isRestore = true;
    this.session$.next(undefined);
  }

  public async save(name: string, url: string) {
    const response = await this.http!.post(`/internal/session`, {
      body: JSON.stringify({
        name,
        url,
        sessionId: this.sessionId,
      }),
    });
    this._isStored = true;
    return response;
  }

  public get(sessionId: string) {
    return this.http!.get(`/internal/session/${encodeURIComponent(sessionId)}}`);
  }

  public find(options: SearchSessionFindOptions) {
    return this.http!.post(`/internal/session`, {
      body: JSON.stringify(options),
    });
  }

  public update(sessionId: string, attributes: Partial<BackgroundSessionSavedObjectAttributes>) {
    return this.http!.put(`/internal/session/${encodeURIComponent(sessionId)}}`, {
      body: JSON.stringify(attributes),
    });
  }

  public delete(sessionId: string) {
    return this.http!.delete(`/internal/session/${encodeURIComponent(sessionId)}}`);
  }
}
