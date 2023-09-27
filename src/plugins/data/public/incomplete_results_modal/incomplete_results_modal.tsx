/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import {
  EuiCallOut,
  EuiCodeBlock,
  EuiTabbedContent,
  EuiCopy,
  EuiButton,
  EuiModalBody,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiModalFooter,
  EuiButtonEmpty,
} from '@elastic/eui';
import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import type { SearchRequest } from '..';
import type { SearchResponseIncompleteWarning } from '../search';
import { ShardFailureTable } from '../shard_failure_modal/shard_failure_table';

export interface Props {
  onClose: () => void;
  request: SearchRequest;
  response: estypes.SearchResponse<any>;
  warning: SearchResponseIncompleteWarning;
}

export function IncompleteResultsModal({ request, response, warning, onClose }: Props) {
  const requestJSON = JSON.stringify(request, null, 2);
  const responseJSON = JSON.stringify(response, null, 2);

  const tabs = [
    {
      id: 'table',
      name: i18n.translate(
        'data.search.searchSource.fetch.incompleteResultsModal.tabHeaderClusterDetails',
        {
          defaultMessage: 'Cluster details',
          description: 'Name of the tab displaying cluster details',
        }
      ),
      content: (
        <>
          {response.timed_out ? (
            <EuiCallOut color="warning">
              <p>
                {i18n.translate(
                  'data.search.searchSource.fetch.incompleteResultsModal.requestTimedOutMessage',
                  {
                    defaultMessage: 'Request timed out',
                  }
                )}
              </p>
            </EuiCallOut>
          ) : null}

          {response._shards.failures?.length ? (
            <ShardFailureTable failures={response._shards.failures ?? []} />
          ) : null}
        </>
      ),
      ['data-test-subj']: 'showClusterDetailsButton',
    },
    {
      id: 'json-request',
      name: i18n.translate(
        'data.search.searchSource.fetch.incompleteResultsModal.tabHeaderRequest',
        {
          defaultMessage: 'Request',
          description: 'Name of the tab displaying the JSON request',
        }
      ),
      content: (
        <EuiCodeBlock
          language="json"
          isCopyable
          data-test-subj="incompleteResultsModalRequestBlock"
        >
          {requestJSON}
        </EuiCodeBlock>
      ),
      ['data-test-subj']: 'showRequestButton',
    },
    {
      id: 'json-response',
      name: i18n.translate(
        'data.search.searchSource.fetch.incompleteResultsModal.tabHeaderResponse',
        {
          defaultMessage: 'Response',
          description: 'Name of the tab displaying the JSON response',
        }
      ),
      content: (
        <EuiCodeBlock
          language="json"
          isCopyable
          data-test-subj="incompleteResultsModalResponseBlock"
        >
          {responseJSON}
        </EuiCodeBlock>
      ),
      ['data-test-subj']: 'showResponseButton',
    },
  ];

  return (
    <React.Fragment>
      <EuiModalHeader>
        <EuiModalHeaderTitle size="xs">
          <FormattedMessage
            id="data.search.searchSource.fetch.incompleteResultsModal.headerTitle"
            defaultMessage="Response contains incomplete results"
          />
        </EuiModalHeaderTitle>
      </EuiModalHeader>
      <EuiModalBody>
        <EuiTabbedContent tabs={tabs} initialSelectedTab={tabs[0]} autoFocus="selected" />
      </EuiModalBody>
      <EuiModalFooter>
        <EuiCopy textToCopy={responseJSON}>
          {(copy) => (
            <EuiButtonEmpty onClick={copy}>
              <FormattedMessage
                id="data.search.searchSource.fetch.incompleteResultsModal.copyToClipboard"
                defaultMessage="Copy response to clipboard"
              />
            </EuiButtonEmpty>
          )}
        </EuiCopy>
        <EuiButton onClick={() => onClose()} fill data-test-subj="closeIncompleteResultsModal">
          <FormattedMessage
            id="data.search.searchSource.fetch.incompleteResultsModal.close"
            defaultMessage="Close"
            description="Closing the Modal"
          />
        </EuiButton>
      </EuiModalFooter>
    </React.Fragment>
  );
}
