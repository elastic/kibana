/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiDelayRender } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { DocViewRenderProps } from '@kbn/unified-doc-viewer/types';
import React, { useState, useMemo } from 'react';
import { TRACE_ID_FIELD } from '@kbn/discover-utils';
import { where } from '@kbn/esql-composer';
import { useDataSourcesContext } from '../../../../../hooks/use_data_sources';
import { ContentFrameworkSection } from '../../../../..';
import { getUnifiedDocViewerServices } from '../../../../../plugin';
import { FullScreenWaterfall } from '../full_screen_waterfall';
import { TraceWaterfallTourStep } from './full_screen_waterfall_tour_step';
import { useDiscoverLinkAndEsqlQuery } from '../../../../../hooks/use_discover_link_and_esql_query';
import { useOpenInDiscoverSectionAction } from '../../../../../hooks/use_open_in_discover_section_action';

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

const sectionTip = i18n.translate('unifiedDocViewer.observability.traces.trace.description', {
  defaultMessage: 'Timeline of all spans in the trace, including their duration and hierarchy.',
});

const sectionTitle = i18n.translate('unifiedDocViewer.observability.traces.trace.title', {
  defaultMessage: 'Trace',
});

export function TraceWaterfall({ traceId, docId, serviceName, dataView }: Props) {
  const { data, discoverShared } = getUnifiedDocViewerServices();
  const { indexes } = useDataSourcesContext();
  const [showFullScreenWaterfall, setShowFullScreenWaterfall] = useState(false);
  const { from: rangeFrom, to: rangeTo } = data.query.timefilter.timefilter.getAbsoluteTime();

  const FocusedTraceWaterfall = discoverShared.features.registry.getById(
    'observability-focused-trace-waterfall'
  )?.render;

  const { discoverUrl, esqlQueryString } = useDiscoverLinkAndEsqlQuery({
    indexPattern: indexes.apm.traces,
    whereClause: where(`${TRACE_ID_FIELD} == ?traceId`, { traceId }),
  });

  const openInDiscoverSectionAction = useOpenInDiscoverSectionAction({
    href: discoverUrl,
    esql: esqlQueryString,
    tabLabel: sectionTitle,
    dataTestSubj: 'unifiedDocViewerObservabilityTracesOpenInDiscoverButton',
  });
  const actionId = 'traceWaterfallFullScreenAction';

  const actions = useMemo(
    () => [
      {
        icon: 'fullScreen',
        onClick: () => setShowFullScreenWaterfall(true),
        label: fullScreenButtonLabel,
        ariaLabel: fullScreenButtonLabel,
        id: actionId,
        dataTestSubj: 'unifiedDocViewerObservabilityTracesTraceFullScreenButton',
      },
      ...(openInDiscoverSectionAction ? [openInDiscoverSectionAction] : []),
    ],
    [openInDiscoverSectionAction]
  );

  if (!FocusedTraceWaterfall) return null;

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
        actions={actions}
      >
        {docId ? (
          <FocusedTraceWaterfall
            traceId={traceId}
            rangeFrom={rangeFrom}
            rangeTo={rangeTo}
            docId={docId}
          />
        ) : null}
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
