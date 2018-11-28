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

import React from 'react';
import {
  EuiCodeBlock,
  EuiButtonEmpty,
} from '@elastic/eui';

import chrome from 'ui/chrome';
import rison from 'rison-node';

function RequestDetailsRequest({ request }) {
  let devToolsButton;
  if (request
    && request.isEsSearchRequest
    && request.esIndex
    && request.json) {
    const searchRequest = rison.encode(request.json);
    const index = rison.encode(request.esIndex);
    devToolsButton = (
      <EuiButtonEmpty
        className="insRequestDetailsRequest__devToolButton"
        href={chrome.addBasePath(`/app/kibana#/dev_tools/console?search_request=${searchRequest}&index=${index}`)}
      >
        Copy request to Console
      </EuiButtonEmpty>
    );
  }

  return (
    <div className="insRequestDetailsRequest__parent">
      {devToolsButton}
      <EuiCodeBlock
        language="json"
        paddingSize="s"
        data-test-subj="inspectorRequestBody"
      >
        { JSON.stringify(request.json, null, 2) }
      </EuiCodeBlock>
    </div>
  );
}

RequestDetailsRequest.shouldShow = (request) => !!request.json;

export { RequestDetailsRequest };
