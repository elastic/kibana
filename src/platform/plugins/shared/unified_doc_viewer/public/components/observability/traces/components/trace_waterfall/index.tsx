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
import { EuiDelayRender } from '@elastic/eui';
import { ContentFrameworkSection } from '../../../../..';
import { getUnifiedDocViewerServices } from '../../../../../plugin';
import { FullScreenWaterfall } from '../full_screen_waterfall';
import { TraceWaterfallTourStep } from './full_screen_waterfall_tour_step';
import { useGetGenerateDiscoverLink } from '../../hooks/use_get_generate_discover_link';
import { createTraceContextWhereClause } from '../../common/create_trace_context_where_clause';

interface Props {
  traceId: string;
  docId?: string;
  serviceName?: string;
  dataView: DocViewRenderProps['dataView'];
}

export const fullScreenButtonLabel = i18n.translate(
  'unifiedDocViewer.observability.traces.trace.fullScreen.button',
  { defaultMessage: 'Expand trace timeline' }
);

export const exploreTraceButtonLabel = i18n.translate(
  'unifiedDocViewer.observability.traces.trace.exploreTrace.button',
  { defaultMessage: 'Explore trace timeline' }
);

const sectionTip = i18n.translate('unifiedDocViewer.observability.traces.trace.description', {
  defaultMessage: 'Timeline of all spans in the trace, including their duration and hierarchy.',
});

const sectionTitle = i18n.translate('unifiedDocViewer.observability.traces.trace.title', {
  defaultMessage: 'Trace',
});

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

  const actionId = 'traceWaterfallFullScreenAction';

  // TODO the POC only uses this only for ESQL (at least for now)
  const query = data.query.queryString.getQuery();
  const isEsqlMode = 'esql' in query;

  const { generateDiscoverLink } = useGetGenerateDiscoverLink({
    indexPattern: 'traces*,remote_cluster:traces*', // TODO put the proper indexes, not hardcoded
    tabLabel: `Trace: ${traceId}`,
  });
  const link = generateDiscoverLink(createTraceContextWhereClause({ traceId }));

  return (
    <>
      {showFullScreenWaterfall ? (
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
        title={sectionTitle}
        description={sectionTip}
        actions={[
          isEsqlMode && link
            ? {
                icon: 'discoverApp',
                href: link,
                label: exploreTraceButtonLabel,
                ariaLabel: exploreTraceButtonLabel,
                id: actionId,
              }
            : {
                icon: 'fullScreen',
                onClick: () => setShowFullScreenWaterfall(true),
                label: fullScreenButtonLabel,
                ariaLabel: fullScreenButtonLabel,
                id: actionId,
              },
        ]}
      >
        {isEsqlMode}
        <EmbeddableRenderer
          type="APM_TRACE_WATERFALL_EMBEDDABLE"
          getParentApi={getParentApi}
          hidePanelChrome
        />
        <EuiDelayRender delay={500}>
          <TraceWaterfallTourStep
            actionId={actionId}
            fullScreenButtonLabel={fullScreenButtonLabel}
            onFullScreenLinkClick={() => setShowFullScreenWaterfall(true)}
          />
        </EuiDelayRender>
      </ContentFrameworkSection>
    </>
  );
}
