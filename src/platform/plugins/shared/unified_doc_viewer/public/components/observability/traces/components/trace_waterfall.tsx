/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback } from 'react';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { TimefilterSetup } from '@kbn/data-plugin/public';
import { ReactEmbeddableRenderer } from '@kbn/embeddable-plugin/public';
import {
  SERVICE_NAME_FIELD,
  TRACE_ID_FIELD,
  TRANSACTION_ID_FIELD,
  type TraceDocumentOverview,
} from '@kbn/discover-utils';
import { EuiFlexGroup, EuiFlexItem, EuiSpacer, EuiTitle } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { traceFields } from '../doc_viewer_span_overview/resources/fields';
import { getSpanFieldConfiguration } from '../doc_viewer_span_overview/resources/get_span_field_configuration';
import { SpanSummaryField } from '../doc_viewer_span_overview/sub_components/span_summary_field';
import { getTransactionFieldConfiguration } from '../doc_viewer_transaction_overview/resources/get_transaction_field_configuration';
import { TransactionSummaryField } from '../doc_viewer_transaction_overview/sub_components/transaction_summary_field';

export interface TraceWaterfallProps {
  document: TraceDocumentOverview;
  displayType: 'span' | 'transaction';
  displayLimit?: number;
}

export const TraceWaterfall = ({
  document,
  displayType,
  displayLimit = 5,
}: TraceWaterfallProps) => {
  const { services } = useKibana<TimefilterSetup>();

  const { absoluteTimeRange } = services.timefilter.useTimefilter();

  const fieldMapper = useCallback(
    (fieldId: string) => {
      const fieldConfiguration =
        displayType === 'span'
          ? getSpanFieldConfiguration(document)[fieldId]
          : getTransactionFieldConfiguration(document)[fieldId];

      const props = {
        key: fieldId,
        fieldId,
        fieldConfiguration,
      };

      return displayType === 'span' ? (
        <SpanSummaryField {...props} />
      ) : (
        <TransactionSummaryField {...props} />
      );
    },
    [document, displayType]
  );

  const getParentApi = useCallback(
    () => ({
      getSerializedStateForChild: () => ({
        rawState: {
          serviceName: document[SERVICE_NAME_FIELD],
          traceId: document[TRACE_ID_FIELD],
          entryTransactionId: document[TRANSACTION_ID_FIELD],
          rangeFrom: new Date(absoluteTimeRange.start).toISOString(),
          rangeTo: new Date(absoluteTimeRange.end).toISOString(),
          displayLimit,
        },
      }),
    }),
    [absoluteTimeRange, document, displayLimit]
  );

  return (
    <>
      <EuiTitle size="s">
        <h2>
          {i18n.translate(
            'unifiedDocViewer.observability.traces.docViewerTraceWaterfall.traceWaterfall.title',
            {
              defaultMessage: 'Trace',
            }
          )}
        </h2>
      </EuiTitle>
      <EuiSpacer size="m" />
      <EuiFlexGroup direction="column">
        <EuiFlexItem>{traceFields.map(fieldMapper)}</EuiFlexItem>
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
