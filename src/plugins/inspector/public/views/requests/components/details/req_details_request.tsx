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

import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { EuiCodeBlock } from '@elastic/eui';
import { Request } from '../../../../adapters/request/types';
import { RequestDetailsProps } from '../types';

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

    return (
      <EuiCodeBlock
        language="json"
        paddingSize="s"
        isCopyable
        data-test-subj="inspectorRequestBody"
      >
        {JSON.stringify(json, null, 2)}
      </EuiCodeBlock>
    );
  }
}
