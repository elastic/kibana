/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiFlexGroup, EuiFlexItem, EuiLoadingChart, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import type {
  LensAnnotationLayer,
  LensSeriesLayer,
  LensXYConfig,
} from '@kbn/lens-embeddable-utils/config_builder';
import { i18n } from '@kbn/i18n';
import { EmbeddableRendererContext } from '@kbn/embeddable-plugin/public';
import type { TimeRange } from '@kbn/data-plugin/common';
import type { Action } from '@kbn/ui-actions-plugin/public';
import React, { useMemo, useRef } from 'react';
import {
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
import { ChangePointEntityTitle } from './change_point_entity_title';
import type { ChangePointCardModel } from '../utils/derive_change_point_cards';
import type { UnifiedChangePointGridProps } from '../types';

const CHART_HEIGHT_PX = 230;

const EMBEDDABLE_QUICK_ACTIONS = {
  quickActions: {
    view: [ACTION_FOCUSED_VIEW, ACTION_INSPECT_PANEL, ADD_TO_EXISTING_CASE_ACTION_ID] as [
      string,
      string,
      string
    ],
  },
};

const DEFAULT_DISABLED_ACTIONS = [
  'ACTION_CUSTOMIZE_PANEL',
  'ACTION_EXPORT_CSV',
  'alertRule',
  'ACTION_OPEN_IN_DISCOVER',
  ACTION_EXPLORE_IN_DISCOVER_TAB,
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
}) => {
  const chartRef = useRef<HTMLDivElement>(null);
  const { euiTheme } = useEuiTheme();

  const chartLayers = useMemo((): LensXYConfig['layers'] => {
    const seriesLayer: LensSeriesLayer = {
      type: 'series',
      seriesType: 'line',
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
        color: '#BD271E',
      })),
    };

    return [seriesLayer, annotationLayer];
  }, [card.annotationEvents, timeColumn, valueColumn]);

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

  const lensProps = useChangePointLensProps({
    lensInstanceId: `changePointMiniLens-${card.id}`,
    title: card.title,
    description: card.entityDescription,
    query: card.lineEsql,
    services,
    fetchParams,
    discoverFetch$,
    chartRef,
    chartLayers,
    timeRange: chartTimeRange,
  });

  const { EmbeddableComponent } = services.lens;

  const extraActions = useMemo((): Action[] => {
    if (!actions?.openInNewTab || !lensProps || !card.annotationEvents.length) return [];

    const timeRange = buildFocusedViewTimeRange(
      card.annotationEvents,
      lensProps.timeRange ?? fetchParams.timeRange
    );

    return timeRange
      ? [
          {
            id: ACTION_FOCUSED_VIEW,
            order: 22,
            type: 'actionButton',
            getDisplayName() {
              return i18n.translate('changePointChartViewer.lens.focusedView', {
                defaultMessage: 'Open in Discover tab',
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
              actions.openInNewTab!({
                query: rawEsql ? { esql: rawEsql } : lensProps.attributes.state.query,
                tabLabel: `${lensProps.attributes.title} - Focused view`,
                timeRange,
              });
            },
          },
        ]
      : [];
  }, [
    actions,
    card.annotationEvents,
    card.entityValues,
    card.lineEsql,
    fetchParams.timeRange,
    lensProps,
  ]);

  return (
    <div
      css={css`
        display: flex;
        flex-direction: column;
        height: ${CHART_HEIGHT_PX}px;
        overflow: hidden;
        outline: ${euiTheme.border.width.thin} solid ${euiTheme.colors.lightShade};
        border-radius: ${euiTheme.border.radius.medium};
      `}
      ref={chartRef}
      data-test-subj={`changePointLensChart-${cardIndex}`}
    >
      <ChangePointEntityTitle card={card} />
      {/* Chart area fills the remaining height */}
      {lensProps ? (
        <div css={chartContainerCss}>
          <EmbeddableRendererContext.Provider value={EMBEDDABLE_QUICK_ACTIONS}>
            <EmbeddableComponent
              {...lensProps}
              title={lensProps.attributes.title}
              hidePanelTitles
              extraActions={extraActions}
              abortController={fetchParams.abortController}
              disabledActions={DEFAULT_DISABLED_ACTIONS}
              withDefaultActions
              onBrushEnd={onBrushEnd}
              onFilter={onFilter}
            />
          </EmbeddableRendererContext.Provider>
        </div>
      ) : (
        <EuiFlexGroup
          style={{ flex: 1 }}
          justifyContent="center"
          alignItems="center"
          responsive={false}
        >
          <EuiFlexItem grow={false}>
            <EuiLoadingChart size="l" />
          </EuiFlexItem>
        </EuiFlexGroup>
      )}

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
