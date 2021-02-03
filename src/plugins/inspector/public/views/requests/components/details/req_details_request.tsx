/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { Request } from '../../../../../common/adapters/request/types';
import { RequestDetailsProps } from '../types';
import { RequestCodeViewer } from './req_code_viewer';

export class RequestDetailsRequest extends Component<RequestDetailsProps> {
  static propTypes = {
    request: PropTypes.object.isRequired,
  };

  static shouldShow = (request: Request) => Boolean(request && request.json);

  render() {
    const { json } = this.props.request;

    if (!json) {
      return null;
    }

    return <RequestCodeViewer json={JSON.stringify(json, null, 2)} />;
  }
}
