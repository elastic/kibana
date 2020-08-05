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
import { FormattedMessage } from '@kbn/i18n/react';
import { i18n } from '@kbn/i18n';
import {
  EuiCodeBlock,
  EuiTabbedContent,
  EuiCopy,
  EuiButton,
  EuiModalBody,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiModalFooter,
  EuiButtonEmpty,
  EuiCallOut,
} from '@elastic/eui';
import { ShardFailureTable } from './shard_failure_table';
import { ShardFailureResponse, ShardFailureRequest } from './shard_failure_types';

export interface Props {
  onClose: () => void;
  request: ShardFailureRequest;
  response: ShardFailureResponse;
  title: string;
}

export function ShardFailureModal({ request, response, title, onClose }: Props) {
  if (!response || !response._shards || !Array.isArray(response._shards.failures) || !request) {
    // this should never ever happen, but just in case
    return (
      <EuiCallOut title="Sorry, there was an error" color="danger" iconType="alert">
        The ShardFailureModal component received invalid properties
      </EuiCallOut>
    );
  }

  const requestJSON = JSON.stringify(request, null, 2);
  const responseJSON = JSON.stringify(response, null, 2);
  const failures = response._shards.failures;

  const tabs = [
    {
      id: 'table',
      name: i18n.translate(
        'data.search.searchSource.fetch.shardsFailedModal.tabHeaderShardFailures',
        {
          defaultMessage: 'Shard failures',
          description: 'Name of the tab displaying shard failures',
        }
      ),
      content: <ShardFailureTable failures={failures} />,
    },
    {
      id: 'json-request',
      name: i18n.translate('data.search.searchSource.fetch.shardsFailedModal.tabHeaderRequest', {
        defaultMessage: 'Request',
        description: 'Name of the tab displaying the JSON request',
      }),
      content: (
        <EuiCodeBlock language="json" isCopyable>
          {requestJSON}
        </EuiCodeBlock>
      ),
    },
    {
      id: 'json-response',
      name: i18n.translate('data.search.searchSource.fetch.shardsFailedModal.tabHeaderResponse', {
        defaultMessage: 'Response',
        description: 'Name of the tab displaying the JSON response',
      }),
      content: (
        <EuiCodeBlock language="json" isCopyable>
          {responseJSON}
        </EuiCodeBlock>
      ),
    },
  ];

  return (
    <React.Fragment>
      <EuiModalHeader>
        <EuiModalHeaderTitle>{title}</EuiModalHeaderTitle>
      </EuiModalHeader>
      <EuiModalBody>
        <EuiTabbedContent tabs={tabs} initialSelectedTab={tabs[0]} autoFocus="selected" />
      </EuiModalBody>
      <EuiModalFooter>
        <EuiCopy textToCopy={responseJSON}>
          {(copy) => (
            <EuiButtonEmpty onClick={copy}>
              <FormattedMessage
                id="data.search.searchSource.fetch.shardsFailedModal.copyToClipboard"
                defaultMessage="Copy response to clipboard"
              />
            </EuiButtonEmpty>
          )}
        </EuiCopy>
        <EuiButton onClick={() => onClose()} fill data-test-sub="closeShardFailureModal">
          <FormattedMessage
            id="data.search.searchSource.fetch.shardsFailedModal.close"
            defaultMessage="Close"
            description="Closing the Modal"
          />
        </EuiButton>
      </EuiModalFooter>
    </React.Fragment>
  );
}
