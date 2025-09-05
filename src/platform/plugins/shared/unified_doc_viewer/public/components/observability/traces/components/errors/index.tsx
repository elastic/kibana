/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1".
 */

import type { EuiInMemoryTableProps } from '@elastic/eui';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiInMemoryTable,
  EuiPanel,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { useMemo } from 'react';
import { ContentFrameworkSection } from '../../../../content_framework/section';
import { getColumns } from './get_columns';
import { useFetchErrors } from './use_fetch_errors';

export interface Props {
  traceId: string;
  transactionId?: string;
  spanId?: string;
  serviceName?: string;
}

const sorting: EuiInMemoryTableProps['sorting'] = {
  sort: { field: 'lastSeen', direction: 'desc' as const },
};

export function Errors({ transactionId, traceId, serviceName, spanId }: Props) {
  const { loading, error, response } = useFetchErrors({
    traceId,
    transactionId,
    spanId,
    serviceName,
  });

  const columns = useMemo(() => getColumns(), []);

  if (loading || (!error && response.errorGroups.length === 0)) {
    return null;
  }

  return (
    <ContentFrameworkSection
      data-test-subj="unifiedDocViewerErrorsAccordion"
      id="errorsSection"
      title={i18n.translate('unifiedDocViewer.observability.traces.docViewerSpanOverview.errors', {
        defaultMessage: 'Errors',
      })}
      description={i18n.translate(
        'unifiedDocViewer.observability.traces.docViewerSpanOverview.errors.description',
        { defaultMessage: 'Errors related to this trace or service' }
      )}
    >
      <EuiSpacer size="s" />
      {error ? (
        <EuiText color="subdued">
          {i18n.translate('unifiedDocViewer.observability.traces.docViewerSpanOverview.error', {
            defaultMessage: 'An error happened when trying to fetch data. Please try again',
          })}
        </EuiText>
      ) : (
        <EuiFlexGroup direction="column" gutterSize="s">
          <EuiFlexItem>
            <EuiPanel hasShadow={false} hasBorder paddingSize="s">
              <EuiInMemoryTable
                responsiveBreakpoint={false}
                items={response.errorGroups}
                columns={columns}
                pagination={{ showPerPageOptions: false, pageSize: 5 }}
                sorting={sorting}
                compressed
              />
            </EuiPanel>
          </EuiFlexItem>
        </EuiFlexGroup>
      )}
    </ContentFrameworkSection>
  );
}
