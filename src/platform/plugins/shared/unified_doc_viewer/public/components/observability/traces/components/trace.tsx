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
import { EuiFlexGroup, EuiFlexItem, EuiSpacer, EuiTitle, EuiButtonEmpty } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { DocViewRenderProps } from '@kbn/unified-doc-viewer/types';
import type { DataViewField } from '@kbn/data-views-plugin/common';
import { SERVICE_NAME_FIELD } from '@kbn/discover-utils';
import { transactionTraceFields, spanTraceFields } from '../doc_viewer_overview/resources/fields';
import { SummaryField } from '../doc_viewer_overview/sub_components/summary_field';
import { getUnifiedDocViewerServices } from '../../../../plugin';
import type { FieldConfiguration } from '../resources/get_field_configuration';
import { FullScreenWaterfall } from './full_screen_waterfall';

export interface TraceProps {
  fields: Record<string, FieldConfiguration>;
  fieldMappings: Record<string, DataViewField | undefined>;
  traceId: string;
  displayType: 'span' | 'transaction';
  docId: string;
  dataView: DocViewRenderProps['dataView'];
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
  showWaterfall = true,
  showActions = true,
}: TraceProps) => {
  const serviceName = fields[SERVICE_NAME_FIELD].value as string;
  const { data } = getUnifiedDocViewerServices();
  const [showFullScreenWaterfall, setShowFullScreenWaterfall] = useState(false);

  const { from: rangeFrom, to: rangeTo } = data.query.timefilter.timefilter.getAbsoluteTime();

  const fullScreenButtonLabel = i18n.translate(
    'unifiedDocViewer.observability.traces.trace.fullScreen.button',
    {
      defaultMessage: 'Expand trace timeline',
    }
  );

  const getParentApi = useCallback(
    () => ({
      getSerializedStateForChild: () => ({
        rawState: {
          traceId,
          rangeFrom,
          rangeTo,
          docId,
          mode: 'summary',
        },
      }),
    }),
    [docId, rangeFrom, rangeTo, traceId]
  );

  const fieldRows =
    displayType === 'span'
      ? spanTraceFields.map((fieldId: string) => (
          <SummaryField
            key={fieldId}
            fieldId={fieldId}
            fieldConfiguration={fields[fieldId]}
            fieldMapping={fieldMappings[fieldId]}
            showActions={showActions}
          />
        ))
      : transactionTraceFields.map((fieldId: string) => (
          <SummaryField
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
          serviceName={serviceName}
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
            <EuiButtonEmpty
              data-test-subj="unifiedDocViewerObservabilityTracesTraceFullScreenButton"
              size="xs"
              iconType="fullScreen"
              onClick={() => {
                setShowFullScreenWaterfall(true);
              }}
              aria-label={fullScreenButtonLabel}
            >
              {fullScreenButtonLabel}
            </EuiButtonEmpty>
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
