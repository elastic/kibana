/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, useState } from 'react';
import { EmbeddableRenderer } from '@kbn/embeddable-plugin/public';
import { EuiFlexGroup, EuiFlexItem, EuiSpacer, EuiTitle, EuiButtonIcon } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { DocViewRenderProps } from '@kbn/unified-doc-viewer/types';
import { DataViewField } from '@kbn/data-views-plugin/common';
import { spanTraceFields } from '../doc_viewer_span_overview/resources/fields';
import { transactionTraceFields } from '../doc_viewer_transaction_overview/resources/fields';
import { SpanSummaryField } from '../doc_viewer_span_overview/sub_components/span_summary_field';
import { TransactionSummaryField } from '../doc_viewer_transaction_overview/sub_components/transaction_summary_field';
import { getUnifiedDocViewerServices } from '../../../../plugin';
import { FieldConfiguration } from '../resources/get_field_configuration';
import { FullScreenWaterfall } from './full_screen_waterfall';

export interface TraceProps {
  fields: Record<string, FieldConfiguration>;
  fieldMappings: Record<string, DataViewField | undefined>;
  traceId: string;
  displayType: 'span' | 'transaction';
  docId: string;
  dataView: DocViewRenderProps['dataView'];
  tracesIndexPattern: string;
  showWaterfall?: boolean;
  showActions?: boolean;
}

export const Trace = ({
  traceId,
  fields,
  fieldMappings,
  displayType,
  docId,
  dataView,
  tracesIndexPattern,
  showWaterfall = true,
  showActions = true,
}: TraceProps) => {
  const { data } = getUnifiedDocViewerServices();
  const [showFullScreenWaterfall, setShowFullScreenWaterfall] = useState(false);

  const { from: rangeFrom, to: rangeTo } = data.query.timefilter.timefilter.getAbsoluteTime();

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
          <SpanSummaryField
            key={fieldId}
            fieldId={fieldId}
            fieldConfiguration={fields[fieldId]}
            fieldMapping={fieldMappings[fieldId]}
            showActions={showActions}
          />
        ))
      : transactionTraceFields.map((fieldId: string) => (
          <TransactionSummaryField
            key={fieldId}
            fieldId={fieldId}
            fieldConfiguration={fields[fieldId]}
            fieldMapping={fieldMappings[fieldId]}
            showActions={showActions}
          />
        ));

  return (
    <>
      {showFullScreenWaterfall && (
        <FullScreenWaterfall
          traceId={traceId}
          rangeFrom={rangeFrom}
          rangeTo={rangeTo}
          dataView={dataView}
          tracesIndexPattern={tracesIndexPattern}
          onExitFullScreen={() => {
            setShowFullScreenWaterfall(false);
          }}
        />
      )}
      <EuiFlexGroup justifyContent="spaceBetween" alignItems="center">
        <EuiFlexItem grow={false}>
          <EuiTitle size="s">
            <h2>
              {i18n.translate('unifiedDocViewer.observability.traces.trace.title', {
                defaultMessage: 'Trace',
              })}
            </h2>
          </EuiTitle>
        </EuiFlexItem>
        {showWaterfall && (
          <EuiFlexItem grow={false}>
            <EuiButtonIcon
              data-test-subj="unifiedDocViewerObservabilityTracesTraceFullScreenButton"
              iconSize="m"
              iconType="fullScreen"
              color="text"
              aria-label={i18n.translate(
                'unifiedDocViewer.observability.traces.trace.fullScreen.button',
                {
                  defaultMessage: 'Open full screen waterfall',
                }
              )}
              onClick={() => {
                setShowFullScreenWaterfall(true);
              }}
            />
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
      <EuiSpacer size="m" />
      <EuiFlexGroup direction="column">
        <EuiFlexItem>{fieldRows}</EuiFlexItem>
      </EuiFlexGroup>

      {showWaterfall && (
        <>
          <EuiSpacer size="m" />
          <EmbeddableRenderer
            type="APM_TRACE_WATERFALL_EMBEDDABLE"
            getParentApi={getParentApi}
            hidePanelChrome
          />
        </>
      )}
    </>
  );
};
