/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EmbeddableRenderer } from '@kbn/embeddable-plugin/public';
import { i18n } from '@kbn/i18n';
import type { DocViewRenderProps } from '@kbn/unified-doc-viewer/types';
import React, { useCallback, useState } from 'react';
import { getUnifiedDocViewerServices } from '../../../../../plugin';
import { ContentFrameworkSection } from '../../../../content_framework/section';
import { FullScreenWaterfall } from '../full_screen_waterfall';

interface Props {
  traceId: string;
  docId?: string;
  serviceName?: string;
  dataView: DocViewRenderProps['dataView'];
}

const fullScreenButtonLabel = i18n.translate(
  'unifiedDocViewer.observability.traces.trace.fullScreen.button',
  { defaultMessage: 'Expand trace timeline' }
);

export function TraceWaterfall({ traceId, docId, serviceName, dataView }: Props) {
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
          mode: 'summary',
        },
      }),
    }),
    [docId, rangeFrom, rangeTo, traceId]
  );

  return (
    <>
      {showFullScreenWaterfall && serviceName ? (
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
      ) : null}
      <ContentFrameworkSection
        id="trace-waterfall"
        title={i18n.translate('unifiedDocViewer.observability.traces.trace.title', {
          defaultMessage: 'Trace',
        })}
        actions={[
          {
            icon: 'fullScreen',
            onClick: () => setShowFullScreenWaterfall(true),
            label: fullScreenButtonLabel,
            ariaLabel: fullScreenButtonLabel,
          },
        ]}
      >
        <EmbeddableRenderer
          type="APM_TRACE_WATERFALL_EMBEDDABLE"
          getParentApi={getParentApi}
          hidePanelChrome
        />
      </ContentFrameworkSection>
    </>
  );
}
