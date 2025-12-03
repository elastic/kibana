/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import React, { useCallback } from 'react';
import { useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import type { ChartSectionProps } from '@kbn/unified-histogram/types';
import { PresentationPanelQuickActionContext } from '@kbn/presentation-panel-plugin/public';
import type { LensProps } from './hooks/use_lens_props';
import { useLensExtraActions } from './hooks/use_lens_extra_actions';
import { ChartTitle } from './chart_title';

export type LensWrapperProps = {
  lensProps: LensProps;
  titleHighlight?: string;
  onViewDetails?: () => void;
  onCopyToDashboard?: () => void;
  syncTooltips?: boolean;
  syncCursor?: boolean;
  abortController: AbortController | undefined;
} & Pick<ChartSectionProps, 'services' | 'onBrushEnd' | 'onFilter' | 'onExploreInDiscoverTab'>;

const DEFAULT_DISABLED_ACTIONS = [
  'ACTION_CUSTOMIZE_PANEL',
  'ACTION_EXPORT_CSV',
  'ACTION_OPEN_IN_DISCOVER',
  'alertRule',
];

export function LensWrapper({
  lensProps,
  services,
  onBrushEnd,
  onFilter,
  abortController,
  titleHighlight,
  onViewDetails,
  onCopyToDashboard,
  onExploreInDiscoverTab,
  syncTooltips,
  syncCursor,
}: LensWrapperProps) {
  const { euiTheme } = useEuiTheme();

  const { EmbeddableComponent } = services.lens;

  const chartCss = css`
    position: relative;
    height: 100%;

    & > div {
      position: absolute;
      height: 100%;
      width: 100%;
    }

    & .embPanel__header {
      visibility: hidden;
    }

    & .lnsExpressionRenderer {
      width: 100%;
      margin: auto;
      box-shadow: none;
    }

    & .echLegend .echLegendList {
      padding-right: ${euiTheme.size.s};
    }

    & > .euiLoadingChart {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
    }
  `;

  const handleExploreInDiscoverTab = useCallback(
    () =>
      onExploreInDiscoverTab?.({
        query: lensProps.attributes.state.query,
        tabLabel: lensProps.attributes.title,
        timeRange: lensProps.timeRange,
      }),
    [
      lensProps.attributes.state.query,
      lensProps.attributes.title,
      lensProps.timeRange,
      onExploreInDiscoverTab,
    ]
  );

  const extraActions = useLensExtraActions({
    copyToDashboard: onCopyToDashboard ? { onClick: onCopyToDashboard } : undefined,
    viewDetails: onViewDetails ? { onClick: onViewDetails } : undefined,
    exploreInDiscoverTab: { onClick: handleExploreInDiscoverTab },
  });

  return (
    <div css={chartCss}>
      <PresentationPanelQuickActionContext.Provider
        value={{ view: ['ACTION_METRICS_EXPERIENCE_EXPLORE_IN_DISCOVER_TAB', 'openInspector'] }}
      >
        <ChartTitle highlight={titleHighlight} title={lensProps.attributes.title} />
        <EmbeddableComponent
          {...lensProps}
          title={lensProps.attributes.title}
          extraActions={extraActions}
          abortController={abortController}
          disabledActions={DEFAULT_DISABLED_ACTIONS}
          withDefaultActions
          onBrushEnd={onBrushEnd}
          onFilter={onFilter}
          syncTooltips={syncTooltips}
          syncCursor={syncCursor}
        />
      </PresentationPanelQuickActionContext.Provider>
    </div>
  );
}
