/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, useState } from 'react';
import { i18n } from '@kbn/i18n';
import type { DocViewRenderProps } from '@kbn/unified-doc-viewer/types';
import { EmbeddableRenderer } from '@kbn/embeddable-plugin/public';
import { ContentFrameworkSection } from '../../../../content_framework/section';
import { getUnifiedDocViewerServices } from '../../../../../plugin';
import { FullScreenWaterfall } from '../full_screen_waterfall';

const fullScreenButtonLabel = i18n.translate(
  'unifiedDocViewer.observability.traces.trace.fullScreen.button',
  {
    defaultMessage: 'Expand trace timeline',
  }
);

const sectionTip = i18n.translate('unifiedDocViewer.observability.traces.trace.description', {
  defaultMessage: 'Timeline of all spans in the trace, including their duration and hierarchy.',
});

const sectionTitle = i18n.translate('unifiedDocViewer.observability.traces.trace.title', {
  defaultMessage: 'Trace',
});

export interface TraceProps {
  dataView: DocViewRenderProps['dataView'];
  traceId: string;
  serviceName: string;
  docId: string;
}

export const Trace = ({ traceId, serviceName, docId, dataView }: TraceProps) => {
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

  const sectionActions = [
    {
      label: fullScreenButtonLabel,
      icon: 'fullScreen',
      ariaLabel: fullScreenButtonLabel,
      dataTestSubj: 'unifiedDocViewerObservabilityTracesTraceFullScreenButton',
      onClick: () => {
        setShowFullScreenWaterfall(true);
      },
    },
  ];

  return (
    <>
      <ContentFrameworkSection
        id="traceSection"
        title={sectionTitle}
        description={sectionTip}
        actions={sectionActions}
      >
        <EmbeddableRenderer
          type="APM_TRACE_WATERFALL_EMBEDDABLE"
          getParentApi={getParentApi}
          hidePanelChrome
        />
      </ContentFrameworkSection>

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
    </>
  );
};
