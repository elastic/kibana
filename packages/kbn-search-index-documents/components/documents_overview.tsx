/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {
  EuiFieldSearch,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiSpacer,
  EuiTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { ChangeEvent } from 'react';

interface DocumentsProps {
  accessControlSwitch?: React.ReactNode;
  dataTelemetryIdPrefix: string;
  documentComponent: React.ReactNode;
  searchQueryCallback: (searchQuery: string) => void;
}
export const DocumentsOverview: React.FC<DocumentsProps> = ({
  accessControlSwitch,
  dataTelemetryIdPrefix,
  documentComponent,
  searchQueryCallback,
}) => {
  return (
    <EuiPanel hasBorder={false} hasShadow={false} paddingSize="none">
      <EuiSpacer />
      <EuiFlexGroup direction="column">
        <EuiFlexItem>
          <EuiFlexGroup direction="row" alignItems="center">
            <EuiFlexItem className="enterpriseSearchDocumentsHeader" grow={false}>
              <EuiTitle size="s">
                <h2>
                  {i18n.translate('searchIndexDocuments.documents.title', {
                    defaultMessage: 'Browse documents',
                  })}
                </h2>
              </EuiTitle>
            </EuiFlexItem>
            {accessControlSwitch && <EuiFlexItem grow={false}>{accessControlSwitch}</EuiFlexItem>}
            <EuiFlexItem>
              <EuiFieldSearch
                data-telemetry-id={`${dataTelemetryIdPrefix}-documents-searchDocuments`}
                placeholder={i18n.translate(
                  'searchIndexDocuments.documents.searchField.placeholder',
                  {
                    defaultMessage: 'Search documents in this index',
                  }
                )}
                isClearable
                onChange={(event: ChangeEvent<HTMLInputElement>) =>
                  searchQueryCallback(event.target.value)
                }
                fullWidth
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
        <EuiFlexItem>{documentComponent}</EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
};
