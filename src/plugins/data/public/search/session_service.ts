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
import { ISessionService } from '../../common/search';

export class SessionService implements ISessionService {
  private sessionId?: string;
  private isRestore!: boolean;
  protected isStored!: boolean;

  constructor() {
    this.start();
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
