/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiDelayRender } from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import type { DocViewRenderProps } from '@kbn/unified-doc-viewer/types';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { TRACE_ID_FIELD } from '@kbn/discover-utils';
import { where } from '@kbn/esql-composer';
import { createRestorableStateProvider } from '@kbn/restorable-state';
import { useDataSourcesContext } from '../../../../../hooks/use_data_sources';
import { ContentFrameworkSection } from '../../../../..';
import { getUnifiedDocViewerServices } from '../../../../../plugin';
import { FullScreenWaterfall } from '../full_screen_waterfall';
import { TraceWaterfallTourStep } from './full_screen_waterfall_tour_step';
import { useDiscoverLinkAndEsqlQuery } from '../../../../../hooks/use_discover_link_and_esql_query';
import { useOpenInDiscoverSectionAction } from '../../../../../hooks/use_open_in_discover_section_action';
import { spanFlyoutId } from '../full_screen_waterfall/waterfall_flyout/span_flyout';
import { logsFlyoutId } from '../full_screen_waterfall/waterfall_flyout/logs_flyout';
import type { DocumentType } from '../full_screen_waterfall/waterfall_flyout/document_detail_flyout';

interface Props {
  traceId: string;
  docId?: string;
  serviceName?: string;
  dataView: DocViewRenderProps['dataView'];
}

export interface TraceWaterfallRestorableState {
  showFullScreenWaterfall: boolean;
  activeFlyoutType: DocumentType | null;
  activeSection: 'errors-table' | undefined;
  activeDocId: string | null;
  activeDocIndex: string | undefined;
}

const { withRestorableState, useRestorableState } =
  createRestorableStateProvider<TraceWaterfallRestorableState>();

export const fullScreenButtonLabel = i18n.translate(
  'unifiedDocViewer.observability.traces.trace.fullScreen.button',
  { defaultMessage: 'Expand trace timeline' }
);

const sectionTip = i18n.translate('unifiedDocViewer.observability.traces.trace.description', {
  defaultMessage:
    'A summary of key spans in the trace. Click the waterfall to view the full trace timeline.',
});

const sectionTitle = i18n.translate('unifiedDocViewer.observability.traces.trace.title', {
  defaultMessage: 'Trace summary',
});

function InternalTraceWaterfall({ traceId, docId, serviceName, dataView }: Props) {
  const { data, discoverShared } = getUnifiedDocViewerServices();
  const { indexes } = useDataSourcesContext();
  const [showFullScreenWaterfall, setShowFullScreenWaterfall] = useRestorableState(
    'showFullScreenWaterfall',
    false
  );
  const [activeFlyoutType, setActiveFlyoutType] = useRestorableState('activeFlyoutType', null);
  const [activeSection, setActiveSection] = useRestorableState('activeSection', undefined);
  const [activeDocId, setActiveDocId] = useRestorableState('activeDocId', null);
  const [activeDocIndex, setActiveDocIndex] = useRestorableState('activeDocIndex', undefined);

  // When restoring state (e.g., returning from another Discover tab), defer mounting
  // FullScreenWaterfall by one render cycle so the parent doc viewer flyout's EUI
  // managed session registers first. Both flyouts use session="start", which creates
  // a LEVEL_MAIN managed session. EUI's useLayoutEffect runs bottom-up, so without
  // deferral the child session registers before the parent, pushing the trace timeline
  // into the session history stack instead of the current session.
  // Using useEffect (not useLayoutEffect) ensures the parent's layout effects have
  // already completed by the time we trigger the deferred mount.
  const isRestoringRef = useRef(showFullScreenWaterfall);
  const [renderReady, setRenderReady] = useState(!isRestoringRef.current);

  useEffect(() => {
    if (isRestoringRef.current) {
      setRenderReady(true);
    }
  }, []);

  useEffect(() => {
    if (renderReady) {
      isRestoringRef.current = false;
    }
  }, [renderReady]);

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

  const clearActiveFlyout = () => {
    setActiveFlyoutType(null);
    setActiveSection(undefined);
    setActiveDocId(null);
    setActiveDocIndex(undefined);
  };

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
    [openInDiscoverSectionAction, setShowFullScreenWaterfall]
  );

  if (!FocusedTraceWaterfall) return null;

  return (
    <>
      {showFullScreenWaterfall && renderReady ? (
        <FullScreenWaterfall
          traceId={traceId}
          rangeFrom={rangeFrom}
          rangeTo={rangeTo}
          dataView={dataView}
          serviceName={serviceName}
          docId={activeDocId}
          docIndex={activeDocIndex}
          activeFlyoutType={activeFlyoutType}
          activeSection={activeSection}
          skipOpenAnimation={isRestoringRef.current}
          onNodeClick={(nodeSpanId) => {
            setActiveSection(undefined);
            setActiveDocId(nodeSpanId);
            setActiveDocIndex(undefined);
            setActiveFlyoutType(spanFlyoutId);
          }}
          onErrorClick={(params) => {
            if (params.errorCount > 1) {
              setActiveFlyoutType(spanFlyoutId);
              setActiveSection('errors-table');
              setActiveDocId(params.docId);
              setActiveDocIndex(undefined);
            } else if (params.errorDocId) {
              setActiveFlyoutType(logsFlyoutId);
              setActiveSection(undefined);
              setActiveDocId(params.errorDocId);
              setActiveDocIndex(params.docIndex);
            }
          }}
          onCloseFlyout={clearActiveFlyout}
          onExitFullScreen={() => {
            setShowFullScreenWaterfall(false);
            clearActiveFlyout();
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
          <div
            data-test-subj="unifiedDocViewerObservabilityTracesTraceWaterfallClickArea"
            aria-label={fullScreenButtonLabel}
            tabIndex={0}
            onClick={() => setShowFullScreenWaterfall(true)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                setShowFullScreenWaterfall(true);
              }
            }}
            css={css`
              &,
              & * {
                cursor: pointer;
              }
            `}
          >
            <FocusedTraceWaterfall
              traceId={traceId}
              rangeFrom={rangeFrom}
              rangeTo={rangeTo}
              docId={docId}
            />
          </div>
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

export const TraceWaterfall = withRestorableState(InternalTraceWaterfall);
