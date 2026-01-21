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
import React, { useCallback, useMemo, useState } from 'react';
import { EuiDelayRender } from '@elastic/eui';
import { css } from '@emotion/react';
import { TRACE_ID_FIELD } from '@kbn/discover-utils';
import { useGetGenerateDiscoverLink } from '../../../../../hooks/use_generate_discover_link';
import { useDataSourcesContext } from '../../../../../hooks/use_data_sources';
import { ContentFrameworkSection } from '../../../../..';
import { getUnifiedDocViewerServices } from '../../../../../plugin';
import { FullScreenWaterfall } from '../full_screen_waterfall';
import { TraceWaterfallTourStep } from './full_screen_waterfall_tour_step';
import { OPEN_IN_DISCOVER_LABEL, OPEN_IN_DISCOVER_ARIA_LABEL } from '../../common/constants';

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
  const { data } = getUnifiedDocViewerServices();
  const { indexes } = useDataSourcesContext();
  const [showFullScreenWaterfall, setShowFullScreenWaterfall] = useState(false);
  const { from: rangeFrom, to: rangeTo } = data.query.timefilter.timefilter.getAbsoluteTime();

  const { generateDiscoverLink } = useGetGenerateDiscoverLink({
    indexPattern: indexes.apm.traces,
  });

  const openInDiscoverLink = useMemo(() => {
    return generateDiscoverLink({ [TRACE_ID_FIELD]: traceId });
  }, [generateDiscoverLink, traceId]);

  const getParentApi = useCallback(
    () => ({
      getSerializedStateForChild: () => ({
        traceId,
        rangeFrom,
        rangeTo,
        docId,
        mode: 'summary',
      }),
    }),
    [docId, rangeFrom, rangeTo, traceId]
  );

  const actionId = 'traceWaterfallFullScreenAction';

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
          ...(openInDiscoverLink
            ? [
                {
                  icon: 'discoverApp',
                  label: OPEN_IN_DISCOVER_LABEL,
                  ariaLabel: OPEN_IN_DISCOVER_ARIA_LABEL,
                  href: openInDiscoverLink,
                  dataTestSubj: 'unifiedDocViewerObservabilityTracesOpenInDiscoverButton',
                },
              ]
            : []),
          {
            icon: 'fullScreen',
            onClick: () => setShowFullScreenWaterfall(true),
            label: fullScreenButtonLabel,
            ariaLabel: fullScreenButtonLabel,
            id: actionId,
            dataTestSubj: 'unifiedDocViewerObservabilityTracesTraceFullScreenButton',
          },
        ]}
      >
        {/* TODO: This is a workaround for layout issues when using hidePanelChrome outside of Dashboard.
        The PresentationPanel applies flex styles (.embPanel__content) that cause width: 0 in non-Dashboard contexts.
        This should be removed once PresentationPanel properly supports hidePanelChrome as an out-of-the-box solution.
        */}
        <div
          css={css`
            width: 100%;
            & .embPanel__content {
              display: block;
            }
          `}
        >
          <EmbeddableRenderer
            type="APM_TRACE_WATERFALL_EMBEDDABLE"
            getParentApi={getParentApi}
            hidePanelChrome
          />
        </div>
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
