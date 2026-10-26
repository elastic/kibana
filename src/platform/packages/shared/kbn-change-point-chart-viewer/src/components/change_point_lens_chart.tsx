/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiFlexGroup, EuiFlexItem, EuiLoadingChart, EuiText, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import type {
  LensAnnotationLayer,
  LensSeriesLayer,
  LensXYConfig,
} from '@kbn/lens-embeddable-utils/config_builder';
import { i18n } from '@kbn/i18n';
import { EmbeddableRendererContext } from '@kbn/embeddable-plugin/public';
import type { Filter, Query, TimeRange } from '@kbn/es-query';
import { apiPublishesRendered } from '@kbn/presentation-publishing';
import type { Action } from '@kbn/ui-actions-plugin/public';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ACTION_ADD_TO_DASHBOARD,
  ACTION_EXPLORE_IN_DISCOVER_TAB,
  ACTION_FOCUSED_VIEW,
  ACTION_INSPECT_PANEL,
  ADD_TO_EXISTING_CASE_ACTION_ID,
} from '../constants';
import {
  buildFocusedViewRawQuery,
  buildFocusedViewTimeRange,
} from '../utils/build_change_point_tab_queries';
import { useChangePointLensProps } from '../hooks/use_change_point_lens_props';
import { ChangePointBadge } from './change_point_badge';
import type { ChangePointCardModel } from '../utils/derive_change_point_cards';
import type { UnifiedChangePointGridProps } from '../types';

const CHART_HEIGHT_PX = 230;

const focusedViewLabel = i18n.translate('changePointChartViewer.lens.focusedViewLabel', {
  defaultMessage: 'Focused view',
});

const EMBEDDABLE_QUICK_ACTIONS = {
  quickActions: {
    view: [
      ACTION_ADD_TO_DASHBOARD,
      ACTION_FOCUSED_VIEW,
      ACTION_INSPECT_PANEL,
      ADD_TO_EXISTING_CASE_ACTION_ID,
    ] as [string, string, string, string],
  },
};

const DEFAULT_DISABLED_ACTIONS = [
  'ACTION_CUSTOMIZE_PANEL',
  'ACTION_EXPORT_CSV',
  'alertRule',
  'ACTION_OPEN_IN_DISCOVER',
  ACTION_EXPLORE_IN_DISCOVER_TAB,
  'ACTION_FILTERS_NOTIFICATION',
];

const chartContainerCss = css`
  position: relative;
  flex: 1;

  & > div {
    position: absolute;
    height: 100%;
    width: 100%;
  }

  & .lnsExpressionRenderer {
    width: 100%;
    margin: auto;
    box-shadow: none;
  }
`;

export interface ChangePointLensChartProps
  extends Pick<
    UnifiedChangePointGridProps,
    'services' | 'fetchParams' | 'fetch$' | 'onBrushEnd' | 'onFilter' | 'actions'
  > {
  card: ChangePointCardModel;
  cardIndex: number;
  valueColumn: string;
  timeColumn: string;
  /** Discover charts keep panel actions. The dashboard grid turns them off. */
  showPanelActions?: boolean;
  searchContext?: {
    filters: Filter[];
    query?: Query;
  };
  /** Dashboard reporting signal. Discover omits it and keeps the chart's current behavior. */
  onRenderedChange?: (rendered: boolean) => void;
  /** Changes identity when the dashboard grid replaces the card list, so a chart reports for the new search. */
  renderGeneration?: object;
}

export const ChangePointLensChart: React.FC<ChangePointLensChartProps> = ({
  card,
  cardIndex,
  valueColumn,
  timeColumn,
  services,
  fetchParams,
  fetch$: discoverFetch$,
  onBrushEnd,
  onFilter,
  actions,
  showPanelActions = true,
  searchContext,
  onRenderedChange,
  renderGeneration,
}) => {
  const chartRef = useRef<HTMLDivElement>(null);
  const { euiTheme } = useEuiTheme();
  const onRenderedChangeRef = useRef(onRenderedChange);
  onRenderedChangeRef.current = onRenderedChange;
  const renderGenerationRef = useRef(renderGeneration);
  renderGenerationRef.current = renderGeneration;
  const lensGenerationRef = useRef<object | undefined>(undefined);
  const [lensApi, setLensApi] = useState<unknown>();
  const handleApiAvailable = useCallback((api: unknown) => {
    setLensApi((current: unknown) => (current === api ? current : api));
  }, []);

  const chartLayers = useMemo((): LensXYConfig['layers'] => {
    const seriesLayer: LensSeriesLayer = {
      type: 'series',
      seriesType: 'area',
      // String xAxis omits `meta.type: date`, so Lens treats X as ordinal — not a time chart and
      // event annotations do not render. Date histogram maps the ES|QL time column as interval/date.
      xAxis: { type: 'dateHistogram', field: timeColumn, minimumInterval: 'auto' },
      yAxis: [
        {
          value: valueColumn,
          label: valueColumn,
        },
      ],
    };

    if (!card.annotationEvents.length) {
      return [seriesLayer];
    }

    const annotationLayer: LensAnnotationLayer = {
      type: 'annotation',
      yAxis: [],
      events: card.annotationEvents.map((e) => ({
        name: e.name,
        datetime: e.datetime,
        icon: 'triangle',
        color: euiTheme.colors.danger,
      })),
    };

    return [seriesLayer, annotationLayer];
  }, [card.annotationEvents, euiTheme.colors.danger, timeColumn, valueColumn]);

  // If any annotation falls before the Discover time range, extend `from` so Lens doesn't clip it.
  // fetchParams.timeRange is always resolved to absolute ISO by processFetchParams, so the
  // comparison with annotation datetime strings is always safe.
  const chartTimeRange = useMemo((): TimeRange => {
    const { timeRange } = fetchParams;
    if (!card.annotationEvents.length) return timeRange;
    const { from, to } = timeRange;

    const earliestAnnotation = card.annotationEvents.reduce(
      (min, e) => (e.datetime < min ? e.datetime : min),
      card.annotationEvents[0].datetime
    );

    return earliestAnnotation < from ? { from: earliestAnnotation, to } : timeRange;
    // fetchParams.timeRange is covered by the dependency array
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [card.annotationEvents, fetchParams.timeRange]);

  const { lensProps, buildError, isInView } = useChangePointLensProps({
    lensInstanceId: `changePointMiniLens-${card.id}`,
    title: card.title,
    // Stored on attributes for case-attachment metadata.
    description: card.entityDescription,
    query: card.lineEsql,
    services,
    fetchParams,
    discoverFetch$,
    chartRef,
    chartLayers,
    timeRange: chartTimeRange,
    searchContext,
    reportVisibility: onRenderedChange !== undefined,
  });

  const reportsRender = onRenderedChange !== undefined;
  useEffect(() => {
    if (!reportsRender || !apiPublishesRendered(lensApi)) {
      return;
    }
    // Keep this subscription for the life of the Lens API. Resubscribing on a new card list
    // would replay the previous search's rendered value before the new chart draw starts.
    const subscription = lensApi.rendered$.subscribe((rendered) => {
      lensGenerationRef.current = renderGenerationRef.current;
      onRenderedChangeRef.current?.(rendered);
    });
    return () => subscription.unsubscribe();
  }, [lensApi, reportsRender]);

  useEffect(() => {
    const report = onRenderedChangeRef.current;
    if (!report) {
      return;
    }
    if (buildError || isInView === false) {
      report(true);
      return;
    }
    if (isInView !== true || lensGenerationRef.current !== renderGeneration) {
      report(false);
      return;
    }
    report(apiPublishesRendered(lensApi) ? lensApi.rendered$.getValue() : false);
  }, [buildError, isInView, lensApi, renderGeneration]);

  const { EmbeddableComponent } = services.lens;

  const extraActions = useMemo((): Action[] => {
    const chartActions: Action[] = [];
    const dashboardEsql = card.dashboardEsql;

    if (actions?.addPageToDashboard && dashboardEsql) {
      chartActions.push({
        id: ACTION_ADD_TO_DASHBOARD,
        order: 1,
        type: 'actionButton',
        getDisplayName() {
          return i18n.translate('changePointChartViewer.lens.addToDashboardLabel', {
            defaultMessage: 'Add to dashboard',
          });
        },
        getIconType() {
          return 'addToDashboard';
        },
        async isCompatible() {
          return true;
        },
        async execute() {
          actions.addPageToDashboard?.({ esql: dashboardEsql, singleSeries: true });
        },
      });
    }

    if (!actions?.openInNewTab || !lensProps || !card.annotationEvents.length) {
      return chartActions;
    }

    const timeRange = buildFocusedViewTimeRange(
      card.annotationEvents,
      lensProps.timeRange ?? fetchParams.timeRange
    );
    if (!timeRange) {
      return chartActions;
    }

    chartActions.push({
      id: ACTION_FOCUSED_VIEW,
      order: 22,
      type: 'actionButton',
      getDisplayName() {
        return i18n.translate('changePointChartViewer.lens.focusedView', {
          defaultMessage: 'Open in a new Discover tab',
        });
      },
      getIconType() {
        return 'productDiscover';
      },
      async isCompatible() {
        return true;
      },
      async execute() {
        const rawEsql = buildFocusedViewRawQuery(card.lineEsql, card.entityValues);
        actions.openInNewTab?.({
          query: rawEsql ? { esql: rawEsql } : lensProps.attributes.state.query,
          tabLabel: `${lensProps.attributes.title} - ${focusedViewLabel}`,
          timeRange,
        });
      },
    });

    return chartActions;
  }, [
    actions,
    card.annotationEvents,
    card.dashboardEsql,
    card.entityValues,
    card.lineEsql,
    fetchParams.timeRange,
    lensProps,
  ]);

  const chart = lensProps ? (
    <EmbeddableComponent
      {...lensProps}
      onApiAvailable={onRenderedChange ? handleApiAvailable : undefined}
      extraActions={showPanelActions ? extraActions : undefined}
      {...(fetchParams.abortController ? { abortController: fetchParams.abortController } : {})}
      disabledActions={showPanelActions ? DEFAULT_DISABLED_ACTIONS : undefined}
      hidePanelTitles={!showPanelActions}
      withDefaultActions={showPanelActions}
      onBrushEnd={showPanelActions ? onBrushEnd : undefined}
      onFilter={showPanelActions ? onFilter : undefined}
    />
  ) : undefined;

  const renderChartBody = () => {
    if (chart) {
      return (
        <div css={chartContainerCss}>
          {showPanelActions ? (
            <EmbeddableRendererContext.Provider value={EMBEDDABLE_QUICK_ACTIONS}>
              {chart}
            </EmbeddableRendererContext.Provider>
          ) : (
            chart
          )}
        </div>
      );
    }

    if (buildError) {
      return (
        <EuiFlexGroup
          css={css`
            flex: 1;
          `}
          justifyContent="center"
          alignItems="center"
          responsive={false}
        >
          <EuiFlexItem grow={false}>
            <EuiText color="danger" size="s" textAlign="center">
              <p>
                {i18n.translate('changePointChartViewer.chart.buildError', {
                  defaultMessage: 'Failed to load chart.',
                })}
              </p>
            </EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
      );
    }

    return (
      <EuiFlexGroup
        css={css`
          flex: 1;
        `}
        justifyContent="center"
        alignItems="center"
        responsive={false}
      >
        <EuiFlexItem grow={false}>
          <EuiLoadingChart size="l" />
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  };

  return (
    <div
      css={css`
        display: flex;
        flex-direction: column;
        height: ${CHART_HEIGHT_PX}px;
        outline: ${euiTheme.border.width.thin} solid ${euiTheme.colors.lightShade};
        border-radius: ${euiTheme.border.radius.medium};
      `}
      ref={chartRef}
      data-test-subj={`changePointLensChart-${cardIndex}`}
    >
      {!showPanelActions && card.title ? (
        <EuiText
          size="xs"
          css={css`
            flex-shrink: 0;
            padding: ${euiTheme.size.xs} ${euiTheme.size.s} 0;
            font-weight: ${euiTheme.font.weight.semiBold};
          `}
        >
          <p
            title={card.title}
            css={css`
              overflow: hidden;
              text-overflow: ellipsis;
              white-space: nowrap;
            `}
          >
            {card.title}
          </p>
        </EuiText>
      ) : null}
      {renderChartBody()}

      {/* Badge row — sits below the chart, right-aligned, never overlaps chart content */}
      <div
        css={css`
          flex-shrink: 0;
          display: flex;
          justify-content: flex-end;
          align-items: center;
          padding: ${euiTheme.size.xs} ${euiTheme.size.s};
        `}
      >
        <ChangePointBadge changePointTypes={card.changePointTypes} minPvalue={card.minPvalue} />
      </div>
    </div>
  );
};
