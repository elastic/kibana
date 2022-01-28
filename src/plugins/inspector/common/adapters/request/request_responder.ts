/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import { Request, RequestStatistics, RequestStatus, Response } from './types';

/**
 * An API to specify information about a specific request that will be logged.
 * Create a new instance to log a request using {@link RequestAdapter#start}.
 */
export class RequestResponder {
  private readonly request: Request;
  private readonly onChange: () => void;

  constructor(request: Request, onChange: () => void) {
    this.request = request;
    this.onChange = onChange;
  }

  public json(reqJson: object): RequestResponder {
    this.request.json = reqJson;
    this.onChange();
    return this;
  }

  public stats(stats: RequestStatistics): RequestResponder {
    this.request.stats = {
      ...(this.request.stats || {}),
      ...stats,
    };

    const startDate = new Date(this.request.startTime);

    this.request.stats.requestTimestamp = {
      label: i18n.translate('inspector.reqTimestampKey', {
        defaultMessage: 'Request timestamp',
      }),
      value: startDate.toISOString(),
      description: i18n.translate('inspector.reqTimestampDescription', {
        defaultMessage: 'Time when the start of the request has been logged',
      }),
    };

    this.onChange();
    return this;
  }

  public finish(status: RequestStatus, response: Response): void {
    this.request.time = response.time ?? Date.now() - this.request.startTime;
    this.request.status = status;
    this.request.response = response;
    this.onChange();
  }

  public ok(response: Response): void {
    this.finish(RequestStatus.OK, response);
  }

  public error(response: Response): void {
    this.finish(RequestStatus.ERROR, response);
  }
}
