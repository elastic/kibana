/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { Component } from 'react';
import { Request } from '../../../../../common/adapters/request/types';
import { DetailViewProps } from './types';
import { RequestCodeViewer } from './req_code_viewer';

export class RequestDetailsResponse extends Component<DetailViewProps> {
  static shouldShow = (request: Request) =>
    Boolean(RequestDetailsResponse.getResponseJson(request));

  static getResponseJson = (request: Request) => (request.response ? request.response.json : null);

  render() {
    const responseJSON = RequestDetailsResponse.getResponseJson(this.props.request);

    if (!responseJSON) {
      return null;
    }

    return <RequestCodeViewer json={JSON.stringify(responseJSON, null, 2)} />;
  }
}
