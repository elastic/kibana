/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback } from 'react';
import { ReactEmbeddableRenderer } from '@kbn/embeddable-plugin/public';
import { EuiFlexGroup, EuiFlexItem, EuiSpacer, EuiTitle } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { spanTraceFields } from '../doc_viewer_span_overview/resources/fields';
import { transactionTraceFields } from '../doc_viewer_transaction_overview/resources/fields';
import { SpanSummaryField } from '../doc_viewer_span_overview/sub_components/span_summary_field';
import { TransactionSummaryField } from '../doc_viewer_transaction_overview/sub_components/transaction_summary_field';
import { getUnifiedDocViewerServices } from '../../../../plugin';
import { FieldConfiguration } from '../resources/get_field_configuration';

export interface TraceProps {
  fields: Record<string, FieldConfiguration>;
  traceId: string;
  displayType: 'span' | 'transaction';
  docId: string;
}

export const Trace = ({ traceId, fields, displayType, docId }: TraceProps) => {
  const { data } = getUnifiedDocViewerServices();

  const {
    timeState: {
      asAbsoluteTimeRange: { from: rangeFrom, to: rangeTo },
    },
  } = data.query.timefilter.timefilter.useTimefilter();

  const getParentApi = useCallback(
    () => ({
      getSerializedStateForChild: () => ({
        rawState: {
          traceId,
          rangeFrom,
          rangeTo,
          docId,
        },
      }),
    }),
    [docId, rangeFrom, rangeTo, traceId]
  );

  const fieldRows =
    displayType === 'span'
      ? spanTraceFields.map((fieldId: string) => (
          <SpanSummaryField key={fieldId} fieldId={fieldId} fieldConfiguration={fields[fieldId]} />
        ))
      : transactionTraceFields.map((fieldId: string) => (
          <TransactionSummaryField
            key={fieldId}
            fieldId={fieldId}
            fieldConfiguration={fields[fieldId]}
          />
        ));

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
        <EuiFlexItem>{fieldRows}</EuiFlexItem>
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
