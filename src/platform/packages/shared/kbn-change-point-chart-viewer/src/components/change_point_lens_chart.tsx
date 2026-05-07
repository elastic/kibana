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
import { buildFocusedViewTimeRange } from '../utils/build_change_point_tab_queries';
import { useChangePointLensProps } from '../hooks/use_change_point_lens_props';
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
  height: 100%;

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
  // Only applies to absolute ISO time ranges; relative expressions (e.g. 'now-30d') are left alone
  // because their computed boundary typically already encloses change points within the user's window.
  const chartTimeRange = useMemo((): TimeRange => {
    const { relativeTimeRange } = fetchParams;
    if (!card.annotationEvents.length) return relativeTimeRange;
    const { from, to } = relativeTimeRange;
    if (from.startsWith('now') || from.startsWith('$')) return relativeTimeRange;

    const earliestAnnotation = card.annotationEvents.reduce(
      (min, e) => (e.datetime < min ? e.datetime : min),
      card.annotationEvents[0].datetime
    );

    return earliestAnnotation < from ? { from: earliestAnnotation, to } : relativeTimeRange;
    // fetchParams.relativeTimeRange is covered by the dependency array
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [card.annotationEvents, fetchParams.relativeTimeRange]);

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
      lensProps.timeRange ?? fetchParams.relativeTimeRange
    );

    return timeRange
      ? [
          {
            id: ACTION_FOCUSED_VIEW,
            order: 22,
            type: 'actionButton',
            getDisplayName() {
              return i18n.translate('changePointChartViewer.lens.focusedView', {
                defaultMessage: 'Focused view in Discover tab',
              });
            },
            getIconType() {
              return 'magnifyPlus';
            },
            async isCompatible() {
              return true;
            },
            async execute() {
              actions.openInNewTab!({
                query: lensProps.attributes.state.query,
                tabLabel: `${lensProps.attributes.title} - Focused view`,
                timeRange,
              });
            },
          },
        ]
      : [];
  }, [actions, card.annotationEvents, fetchParams.relativeTimeRange, lensProps]);

  return (
    <div
      css={css`
        height: ${CHART_HEIGHT_PX}px;
        outline: ${euiTheme.border.width.thin} solid ${euiTheme.colors.lightShade};
        border-radius: ${euiTheme.border.radius.medium};
      `}
      ref={chartRef}
      data-test-subj={`changePointLensChart-${cardIndex}`}
    >
      {lensProps ? (
        <div css={chartContainerCss}>
          <EmbeddableRendererContext.Provider value={EMBEDDABLE_QUICK_ACTIONS}>
            <EmbeddableComponent
              {...lensProps}
              title={lensProps.attributes.title}
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
          style={{ height: '100%' }}
          justifyContent="center"
          alignItems="center"
          responsive={false}
        >
          <EuiFlexItem grow={false}>
            <EuiLoadingChart size="l" />
          </EuiFlexItem>
        </EuiFlexGroup>
      )}
    </div>
  );
};
