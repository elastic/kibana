/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useState } from 'react';

import {
  EuiCodeBlock,
  EuiFlexGroup,
  EuiFlexItem,
  EuiForm,
  EuiPageTemplate,
  EuiPanel,
  EuiSuperUpdateButton,
  EuiText,
  EuiTextArea,
  EuiSpacer,
} from '@elastic/eui';

import { CoreStart } from '@kbn/core/public';

import {
  DataPublicPluginStart,
  IKibanaSearchResponse,
  isRunningResponse,
} from '@kbn/data-plugin/public';
import {
  SQL_SEARCH_STRATEGY,
  SqlSearchStrategyRequest,
  SqlSearchStrategyResponse,
} from '@kbn/data-plugin/common';

interface SearchExamplesAppDeps {
  notifications: CoreStart['notifications'];
  data: DataPublicPluginStart;
}

export const SqlSearchExampleApp = ({ notifications, data }: SearchExamplesAppDeps) => {
  const [sqlQuery, setSqlQuery] = useState<string>('');
  const [request, setRequest] = useState<Record<string, any>>({});
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [rawResponse, setRawResponse] = useState<Record<string, any>>({});

  function setResponse(response: IKibanaSearchResponse) {
    setRawResponse(response.rawResponse);
  }

  const doSearch = async () => {
    const req: SqlSearchStrategyRequest = {
      params: {
        query: sqlQuery,
      },
    };

    // Submit the search request using the `data.search` service.
    setRequest(req.params!);
    setIsLoading(true);

    data.search
      .search<SqlSearchStrategyRequest, SqlSearchStrategyResponse>(req, {
        strategy: SQL_SEARCH_STRATEGY,
      })
      .subscribe({
        next: (res) => {
          if (!isRunningResponse(res)) {
            setIsLoading(false);
            setResponse(res);
          }
        },
        error: (e) => {
          setIsLoading(false);
          data.search.showError(e);
        },
      });
  };

  return (
    <>
      <EuiPageTemplate.Header pageTitle="SQL search example" />
      <EuiPageTemplate.Section grow={false}>
        <EuiForm>
          <EuiFlexGroup>
            <EuiFlexItem grow>
              <EuiTextArea
                placeholder="SELECT * FROM library ORDER BY page_count DESC"
                aria-label="SQL query to run"
                value={sqlQuery}
                onChange={(e) => setSqlQuery(e.target.value)}
                fullWidth
                data-test-subj="sqlQueryInput"
              />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiSuperUpdateButton
                isLoading={isLoading}
                isDisabled={sqlQuery.length === 0}
                onClick={doSearch}
                fill={true}
                data-test-subj="querySubmitButton"
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiForm>

        <EuiSpacer />

        <EuiFlexGroup gutterSize="l">
          <EuiFlexItem grow style={{ minWidth: 0 }}>
            <EuiPanel grow hasShadow={false} hasBorder>
              <EuiText>
                <h3>Request</h3>
              </EuiText>
              <EuiCodeBlock
                language="json"
                fontSize="s"
                paddingSize="s"
                overflowHeight={720}
                isCopyable
                data-test-subj="requestCodeBlock"
                isVirtualized
              >
                {JSON.stringify(request, null, 2)}
              </EuiCodeBlock>
            </EuiPanel>
          </EuiFlexItem>
          <EuiFlexItem grow style={{ minWidth: 0 }}>
            <EuiPanel grow hasShadow={false} hasBorder>
              <EuiText>
                <h3>Response</h3>
              </EuiText>
              <EuiCodeBlock
                language="json"
                fontSize="s"
                paddingSize="s"
                isCopyable
                data-test-subj="responseCodeBlock"
                overflowHeight={720}
                isVirtualized
              >
                {JSON.stringify(rawResponse, null, 2)}
              </EuiCodeBlock>
            </EuiPanel>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiPageTemplate.Section>
    </>
  );
};
