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
import { EuiFlexGroup, EuiFlexItem, EuiInMemoryTable, EuiSpacer, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { useMemo } from 'react';
import { ContentFrameworkSection } from '../../../../content_framework/section';
import { getColumns } from './get_columns';
import { useFetchErrorsByTraceId } from './use_fetch_errors_by_trace_id';
import { useDataSourcesContext } from '../../hooks/use_data_sources';
import { useGetGenerateDiscoverLink } from '../../hooks/use_get_generate_discover_link';
import { OPEN_IN_DISCOVER_LABEL, OPEN_IN_DISCOVER_LABEL_ARIAL_LABEL } from '../../common/constants';
import { createTraceContextWhereClause } from '../../common/create_trace_context_where_clause';

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
  const { indexes } = useDataSourcesContext();
  const { generateDiscoverLink } = useGetGenerateDiscoverLink({ indexPattern: indexes.apm.errors });

  const { loading, error, response } = useFetchErrorsByTraceId({
    traceId,
    transactionId,
    spanId,
  });

  const { columns, openInDiscoverLink } = useMemo(() => {
    const cols = getColumns({ traceId, spanId, transactionId, generateDiscoverLink });

    const link = generateDiscoverLink(
      createTraceContextWhereClause({ traceId, spanId, transactionId })
    );

    return { columns: cols, openInDiscoverLink: link };
  }, [traceId, spanId, transactionId, generateDiscoverLink]);

  if (loading || (!error && response.traceErrors.length === 0)) {
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
        { defaultMessage: 'Errors that occurred during this span and their causes' }
      )}
      actions={
        openInDiscoverLink
          ? [
              {
                icon: 'discoverApp',
                label: OPEN_IN_DISCOVER_LABEL,
                ariaLabel: OPEN_IN_DISCOVER_LABEL_ARIAL_LABEL,
                href: openInDiscoverLink,
                dataTestSubj: 'unifiedDocViewerSpanLinksRefreshButton',
              },
            ]
          : undefined
      }
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
            <EuiInMemoryTable
              responsiveBreakpoint={false}
              items={response.traceErrors}
              columns={columns}
              pagination={{ showPerPageOptions: false, pageSize: 5 }}
              sorting={sorting}
              compressed
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      )}
    </ContentFrameworkSection>
  );
}
