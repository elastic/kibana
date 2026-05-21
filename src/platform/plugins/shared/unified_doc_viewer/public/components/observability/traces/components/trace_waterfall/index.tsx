/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiDelayRender, type EuiFlyoutProps } from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import type { DocViewRenderProps } from '@kbn/unified-doc-viewer/types';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { TRACE_ID_FIELD } from '@kbn/discover-utils';
import { where } from '@kbn/esql-composer';
import { createRestorableStateProvider } from '@kbn/restorable-state';
import { getEbtProps } from '@kbn/ebt-click';
import { useDataSourcesContext } from '../../../../../hooks/use_data_sources';
import { ContentFrameworkSection } from '../../../../..';
import { getUnifiedDocViewerServices } from '../../../../../plugin';
import { FullScreenWaterfall, type FullScreenWaterfallProps } from '../full_screen_waterfall';
import { TraceWaterfallTourStep } from './full_screen_waterfall_tour_step';
import { useDiscoverLinkAndEsqlQuery } from '../../../../../hooks/use_discover_link_and_esql_query';
import { useOpenInDiscoverSectionAction } from '../../../../../hooks/use_open_in_discover_section_action';
import type { TraceDocFlyoutType } from '../../common/types';
import {
  TRACES_DOC_VIEWER_EBT_CLICK_ACTIONS,
  TRACES_DOC_VIEWER_EBT_ELEMENTS,
  TRACES_DOC_VIEWER_EBT_DETAILS,
} from '../../ebt_constants';

interface Props {
  traceId: string;
  docId?: string;
  serviceName?: string;
  dataView: DocViewRenderProps['dataView'];
  ebtDetail?: 'spanDoc' | 'logDoc';
}

export interface TraceWaterfallRestorableState {
  restoredTraceId: string | null;
  showFullScreenWaterfall: boolean;
  activeFlyoutType: TraceDocFlyoutType | null;
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

function InternalTraceWaterfall({
  traceId,
  docId,
  serviceName,
  dataView,
  ebtDetail = TRACES_DOC_VIEWER_EBT_DETAILS.SPAN_DOC,
}: Props) {
  const { data, discoverShared } = getUnifiedDocViewerServices();
  const { indexes } = useDataSourcesContext();

  const [restoredTraceId, setRestoredTraceId] = useRestorableState('restoredTraceId', null);

  const shouldIgnoredRestoredValue = useCallback(
    () => restoredTraceId != null && restoredTraceId !== traceId,
    [restoredTraceId, traceId]
  );

  const [showFullScreenWaterfall, setShowFullScreenWaterfall] = useRestorableState(
    'showFullScreenWaterfall',
    false,
    { shouldIgnoredRestoredValue }
  );
  const [activeFlyoutType, setActiveFlyoutType] = useRestorableState('activeFlyoutType', null, {
    shouldIgnoredRestoredValue,
  });
  const [activeSection, setActiveSection] = useRestorableState('activeSection', undefined, {
    shouldIgnoredRestoredValue,
  });
  const [activeDocId, setActiveDocId] = useRestorableState('activeDocId', null, {
    shouldIgnoredRestoredValue,
  });
  const [activeDocIndex, setActiveDocIndex] = useRestorableState('activeDocIndex', undefined, {
    shouldIgnoredRestoredValue,
  });

  useEffect(() => {
    setRestoredTraceId(traceId);
  }, [traceId, setRestoredTraceId]);

  // Defer mounting FullScreenWaterfall by one render cycle when restoring state so the
  // parent flyout's EUI managed session (session="start") registers before the child's.
  // Without this, the child session pushes the trace timeline into the history stack.
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
    ebt: { element: TRACES_DOC_VIEWER_EBT_ELEMENTS.TRACE_SUMMARY, detail: ebtDetail },
  });

  const actionId = 'traceWaterfallFullScreenAction';

  const clearActiveFlyout = useCallback(() => {
    setActiveFlyoutType(null);
    setActiveSection(undefined);
    setActiveDocId(null);
    setActiveDocIndex(undefined);
  }, [setActiveFlyoutType, setActiveSection, setActiveDocId, setActiveDocIndex]);

  const onNodeClick = useCallback(
    (nodeSpanId: string) => {
      setActiveSection(undefined);
      setActiveDocId(nodeSpanId);
      setActiveDocIndex(undefined);
      setActiveFlyoutType('span');
    },
    [setActiveSection, setActiveDocId, setActiveDocIndex, setActiveFlyoutType]
  );

  const onErrorClick = useCallback<FullScreenWaterfallProps['onErrorClick']>(
    (params) => {
      if (params.errorCount > 1) {
        setActiveFlyoutType('span');
        setActiveSection('errors-table');
        setActiveDocId(params.docId);
        setActiveDocIndex(undefined);
      } else if (params.errorDocId) {
        setActiveFlyoutType('log');
        setActiveSection(undefined);
        setActiveDocId(params.errorDocId);
        setActiveDocIndex(params.docIndex);
      }
    },
    [setActiveFlyoutType, setActiveSection, setActiveDocId, setActiveDocIndex]
  );

  // EUI's flyout manager fires `onClose` with a synthetic MouseEvent('navigation'),
  // When the user switches tabs in discover, and back-button click.
  // We must preserve restorable state during tab switching, but not back-button.
  //
  // NOTE: The 'navigation' event type string is an EUI internal, it is not part
  // of EUI's public API and may change without notice. If this breaks after an EUI
  // upgrade, check `flyout_managed.tsx` for the current synthetic event type.
  // See https://github.com/elastic/eui/issues/9539 for an ER to make this less brittle.
  //
  // When we receive a 'navigation' event, we defer the state clearing to a
  // `useEffect`. When switching tabs, the component is unmounting, so React
  // will not run new effects, the deferred clear never happens and the restorable
  // state is preserved. During a back-button click the component stays alive, the
  // effect runs on the next render, and the state is cleared.
  //
  // See: https://github.com/elastic/eui/blob/v113.3.0/packages/eui/src/components/flyout/manager/flyout_managed.tsx
  const [pendingClose, setPendingClose] = useState<'exit' | 'child' | null>(null);

  useEffect(() => {
    if (pendingClose === 'exit') {
      setShowFullScreenWaterfall(false);
      clearActiveFlyout();
      setPendingClose(null);
    } else if (pendingClose === 'child') {
      clearActiveFlyout();
      setPendingClose(null);
    }
  }, [pendingClose, setShowFullScreenWaterfall, clearActiveFlyout]);

  const onExitFullScreen = useCallback<NonNullable<EuiFlyoutProps['onClose']>>(
    (event) => {
      if (event.type === 'navigation') {
        setPendingClose('exit');
        return;
      }

      setShowFullScreenWaterfall(false);
      clearActiveFlyout();
    },
    [setShowFullScreenWaterfall, clearActiveFlyout]
  );

  const onCloseFlyout = useCallback<NonNullable<EuiFlyoutProps['onClose']>>(
    (event) => {
      if (event.type === 'navigation') {
        setPendingClose('child');
        return;
      }

      clearActiveFlyout();
    },
    [clearActiveFlyout]
  );

  const contextSpanIds = useMemo(() => (docId ? [docId] : undefined), [docId]);

  const actions = useMemo(
    () => [
      {
        icon: 'fullScreen',
        onClick: () => setShowFullScreenWaterfall(true),
        label: fullScreenButtonLabel,
        ariaLabel: fullScreenButtonLabel,
        id: actionId,
        dataTestSubj: 'unifiedDocViewerObservabilityTracesTraceFullScreenButton',
        ebt: {
          action: TRACES_DOC_VIEWER_EBT_CLICK_ACTIONS.EXPAND_TRACE,
          element: TRACES_DOC_VIEWER_EBT_ELEMENTS.TRACE_SUMMARY_EXPAND_BUTTON,
          detail: ebtDetail,
        },
      },
      ...(openInDiscoverSectionAction ? [openInDiscoverSectionAction] : []),
    ],
    [ebtDetail, openInDiscoverSectionAction, setShowFullScreenWaterfall]
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
          contextSpanIds={contextSpanIds}
          scrollToContextOnMount={docId != null}
          docId={activeDocId}
          docIndex={activeDocIndex}
          activeFlyoutType={activeFlyoutType}
          activeSection={activeSection}
          skipOpenAnimation={isRestoringRef.current}
          onNodeClick={onNodeClick}
          onErrorClick={onErrorClick}
          onCloseFlyout={onCloseFlyout}
          onExitFullScreen={onExitFullScreen}
          skipNextEventReport={isRestoringRef.current}
        />
      ) : null}
      <ContentFrameworkSection
        id="trace-waterfall"
        data-test-subj="unifiedDocViewerTraceSummarySection"
        title={sectionTitle}
        description={sectionTip}
        actions={actions}
      >
        <div
          data-test-subj="unifiedDocViewerTraceSummaryTraceWaterfallClickArea"
          {...getEbtProps({
            action: TRACES_DOC_VIEWER_EBT_CLICK_ACTIONS.EXPAND_TRACE,
            element: TRACES_DOC_VIEWER_EBT_ELEMENTS.TRACE_SUMMARY_WATERFALL_AREA,
            detail: ebtDetail,
          })}
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
