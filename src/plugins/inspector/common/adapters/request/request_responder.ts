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
    this.request.time = Date.now() - this.request.startTime;
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
