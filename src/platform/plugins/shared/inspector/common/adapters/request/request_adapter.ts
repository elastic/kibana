/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';
import { RequestResponder } from './request_responder';
import { Request, RequestParams, RequestStatus } from './types';

/**
 * An generic inspector adapter to log requests.
 * These can be presented in the inspector using the requests view.
 * The adapter is not coupled to a specific implementation or even Elasticsearch
 * instead it offers a generic API to log requests of any kind.
 * @extends EventEmitter
 */
export class RequestAdapter extends EventEmitter {
  private requests: Map<string, Request>;
  private responses: WeakMap<Request, RequestResponder>;

  constructor() {
    super();
    this.requests = new Map();
    this.responses = new WeakMap();
  }

  /**
   * Start logging a new request into this request adapter. The new request will
   * by default be in a processing state unless you explicitly finish it via
   * {@link RequestResponder#finish}, {@link RequestResponder#ok} or
   * {@link RequestResponder#error}.
   *
   * @param  {string} name The name of this request as it should be shown in the UI.
   * @param  {RequestParams} params Additional arguments for the request.
   * @param  {number} [startTime] Set an optional start time for the request
   * @return {RequestResponder} An instance to add information to the request and finish it.
   */
  public start(
    name: string,
    params: RequestParams = {},
    startTime: number = Date.now()
  ): RequestResponder {
    const req: Request = {
      ...params,
      name,
      startTime,
      status: RequestStatus.PENDING,
      id: params.id ?? uuidv4(),
    };
    this.requests.set(req.id, req);
    this._onChange();
    const responder = new RequestResponder(req, () => this._onChange());
    this.responses.set(req, responder);
    return responder;
  }

  public loadFromEntries(
    requests: Map<string, Request>,
    responses: WeakMap<Request, RequestResponder>
  ) {
    this.requests = requests;
    this.responses = responses;
  }

  public reset(): void {
    this.requests = new Map();
    this._onChange();
  }

  public resetRequest(id: string): void {
    const req = this.requests.get(id);
    this.requests.delete(id);
    if (req) {
      this.responses.delete(req);
    }
    this._onChange();
  }

  public getRequests(): Request[] {
    return Array.from(this.requests.values());
  }

  public getRequestEntries(): Array<[Request, RequestResponder]> {
    return this.getRequests()
      .map((req) => [req, this.responses.get(req)] as [Request, RequestResponder])
      .filter(([_req, responder]) => responder != null);
  }

  private _onChange(): void {
    this.emit('change');
  }
}
