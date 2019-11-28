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

import { EventEmitter } from 'events';
import _ from 'lodash';
import uuid from 'uuid/v4';
import { RequestResponder } from './request_responder';
import { Request, RequestParams, RequestStatus } from './types';

/**
 * An generic inspector adapter to log requests.
 * These can be presented in the inspector using the requests view.
 * The adapter is not coupled to a specific implementation or even Elasticsearch
 * instead it offers a generic API to log requests of any kind.
 * @extends EventEmitter
 */
class RequestAdapter extends EventEmitter {
  private requests: Map<string, Request>;

  constructor() {
    super();
    this.requests = new Map();
  }

  /**
   * Start logging a new request into this request adapter. The new request will
   * by default be in a processing state unless you explicitly finish it via
   * {@link RequestResponder#finish}, {@link RequestResponder#ok} or
   * {@link RequestResponder#error}.
   *
   * @param  {string} name The name of this request as it should be shown in the UI.
   * @param  {object} args Additional arguments for the request.
   * @return {RequestResponder} An instance to add information to the request and finish it.
   */
  public start(name: string, params: RequestParams = {}): RequestResponder {
    const req: Request = {
      ...params,
      name,
      startTime: Date.now(),
      status: RequestStatus.PENDING,
      id: params.id ?? uuid(),
    };
    this.requests.set(req.id, req);
    this._onChange();
    return new RequestResponder(req, () => this._onChange());
  }

  public reset(): void {
    this.requests = new Map();
    this._onChange();
  }

  public resetRequest(id: string): void {
    this.requests.delete(id);
    this._onChange();
  }

  public getRequests(): Request[] {
    return Array.from(this.requests.values());
  }

  private _onChange(): void {
    this.emit('change');
  }
}

export { RequestAdapter };
