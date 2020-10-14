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
import { Subject, Subscription } from 'rxjs';
import { PluginInitializerContext, StartServicesAccessor } from 'kibana/public';
import { ISessionService } from '../../common/search';
import { ConfigSchema } from '../../config';

export class SessionService implements ISessionService {
  private sessionId?: string;
  private session$: Subject<string | undefined> = new Subject();
  private appChangeSubscription$?: Subscription;
  private curApp?: string;

  constructor(
    initializerContext: PluginInitializerContext<ConfigSchema>,
    getStartServices: StartServicesAccessor
  ) {
    /*
      Make sure that apps don't leave sessions open.
     */
    getStartServices().then(([coreStart]) => {
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

  public start() {
    this.sessionId = uuid.v4();
    this.session$.next(this.sessionId);
    return this.sessionId;
  }

  public clear() {
    this.sessionId = undefined;
    this.session$.next(this.sessionId);
  }
}
