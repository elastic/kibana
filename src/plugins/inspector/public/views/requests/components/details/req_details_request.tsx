/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { Component } from 'react';
import { Request } from '../../../../../common/adapters/request/types';
import { DetailViewProps } from './types';
import { RequestDetailsRequestContent } from './req_details_request_content';

export class RequestDetailsRequest extends Component<DetailViewProps> {
  static shouldShow = (request: Request) => Boolean(request && request.json);

  render() {
    const { json } = this.props.request;

    if (!json) {
      return null;
    }

    return (
      <RequestDetailsRequestContent
        indexPattern={this.props.request.stats?.indexPattern?.value}
        requestParams={this.props.request.response?.requestParams}
        json={JSON.stringify(json, null, 2)}
      />
    );
  }
}
