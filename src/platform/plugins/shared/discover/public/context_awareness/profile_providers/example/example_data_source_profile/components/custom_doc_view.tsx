/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  EuiButton,
  EuiCodeBlock,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiTitle,
} from '@elastic/eui';
import React from 'react';
import type { OpenInNewTabParams, UpdateESQLQueryFn } from '../../../../types';

export const CustomDocView: React.FC<{
  openInNewTab?: (params: OpenInNewTabParams) => void;
  updateESQLQuery?: UpdateESQLQueryFn;
  formattedRecord: string;
}> = ({ openInNewTab, updateESQLQuery, formattedRecord }) => (
  <>
    <EuiSpacer size="s" />
    <EuiFlexGroup direction="column" gutterSize="s" responsive={false}>
      <EuiFlexGroup
        direction="row"
        gutterSize="s"
        justifyContent="spaceBetween"
        alignItems="flexEnd"
        responsive={false}
      >
        <EuiTitle size="xs">
          <h3 data-test-subj="exampleDataSourceProfileDocView">Example doc view</h3>
        </EuiTitle>
        {(openInNewTab || updateESQLQuery) && (
          <EuiFlexItem grow={false}>
            <EuiFlexGroup direction="row" gutterSize="s" responsive={false}>
              {updateESQLQuery && (
                <EuiButton
                  color="text"
                  size="s"
                  onClick={() => {
                    updateESQLQuery('FROM my-example-logs | LIMIT 5');
                  }}
                  data-test-subj="exampleDataSourceProfileDocViewUpdateEsqlQuery"
                >
                  Update ES|QL query
                </EuiButton>
              )}
              {openInNewTab && (
                <EuiButton
                  color="text"
                  size="s"
                  onClick={() => {
                    openInNewTab({
                      tabLabel: 'My new tab',
                      query: { esql: 'FROM my-example-logs | LIMIT 5' },
                    });
                  }}
                  data-test-subj="exampleDataSourceProfileDocViewOpenNewTab"
                >
                  Open new tab
                </EuiButton>
              )}
            </EuiFlexGroup>
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
      <EuiCodeBlock language="json" data-test-subj="exampleDataSourceProfileDocViewRecord">
        {formattedRecord}
      </EuiCodeBlock>
    </EuiFlexGroup>
  </>
);
