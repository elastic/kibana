/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, useMemo } from 'react';
import { ReactEmbeddableRenderer } from '@kbn/embeddable-plugin/public';
import { EuiFlexGroup, EuiFlexItem, EuiSpacer, EuiTitle } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { traceFields } from '../doc_viewer_span_overview/resources/fields';
import { SpanSummaryField } from '../doc_viewer_span_overview/sub_components/span_summary_field';
import { TransactionSummaryField } from '../doc_viewer_transaction_overview/sub_components/transaction_summary_field';
import { getUnifiedDocViewerServices } from '../../../../plugin';
import { FieldConfiguration } from '../resources/get_field_configuration';

export interface TraceProps {
  fields: Record<string, FieldConfiguration>;
  serviceName: string;
  traceId: string;
  transactionId?: string;
  displayType: 'span' | 'transaction';
  displayLimit?: number;
}

export const Trace = ({
  serviceName,
  traceId,
  transactionId,
  fields,
  displayType,
  displayLimit = 5,
}: TraceProps) => {
  const { data } = getUnifiedDocViewerServices();

  const { absoluteTimeRange } = data.query.timefilter.timefilter.useTimefilter();

  const { rangeFrom, rangeTo } = useMemo(
    () => ({
      rangeFrom: new Date(absoluteTimeRange.start).toISOString(),
      rangeTo: new Date(absoluteTimeRange.end).toISOString(),
    }),
    [absoluteTimeRange]
  );

  const getParentApi = useCallback(
    () => ({
      getSerializedStateForChild: () => ({
        rawState: {
          serviceName,
          traceId,
          entryTransactionId: transactionId,
          rangeFrom,
          rangeTo,
          displayLimit,
        },
      }),
    }),
    [rangeFrom, rangeTo, displayLimit, serviceName, traceId, transactionId]
  );

  return (
    <>
      <EuiTitle size="s">
        <h2>
          {i18n.translate('unifiedDocViewer.observability.traces.trace.title', {
            defaultMessage: 'Trace',
          })}
        </h2>
      </EuiTitle>
      <EuiSpacer size="m" />
      <EuiFlexGroup direction="column">
        <EuiFlexItem>
          {traceFields.map((fieldId: string) => {
            const props = {
              key: fieldId,
              fieldId,
              fieldConfiguration: fields[fieldId],
            };

            return displayType === 'span' ? (
              <SpanSummaryField {...props} />
            ) : (
              <TransactionSummaryField {...props} />
            );
          })}
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="m" />
      <ReactEmbeddableRenderer
        type="APM_TRACE_WATERFALL_EMBEDDABLE"
        getParentApi={getParentApi}
        hidePanelChrome={true}
      />
    </>
  );
};
