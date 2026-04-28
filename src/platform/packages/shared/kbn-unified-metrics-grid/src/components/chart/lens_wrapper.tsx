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
import { PresentationPanelQuickActionContext } from '@kbn/presentation-panel-plugin/public';
import type { LensProps } from './hooks/use_lens_props';
import { useLensExtraActions } from './hooks/use_lens_extra_actions';
import { ACTION_EXPLORE_IN_DISCOVER_TAB } from '../../common/constants';
import type { UnifiedMetricsGridProps } from '../../types';

export type LensWrapperProps = {
  lensProps: LensProps;
  titleHighlight?: string;
  onViewDetails?: () => void;
  onCopyToDashboard?: () => void;
  onExploreInDiscoverTab?: UnifiedMetricsGridProps['actions']['openInNewTab'];
  syncTooltips?: boolean;
  syncCursor?: boolean;
  abortController: AbortController | undefined;
  disabledActions?: string[];
  extraDisabledActions?: string[];
} & Pick<UnifiedMetricsGridProps, 'services' | 'onBrushEnd' | 'onFilter'>;

const DEFAULT_DISABLED_ACTIONS = ['ACTION_CUSTOMIZE_PANEL', 'ACTION_EXPORT_CSV', 'alertRule'];
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
  extraDisabledActions = [],
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

    // Style mark elements (from EuiHighlight) in panel headers to match Discover's highlight colors
    & .embPanel__header mark,
    & [data-test-subj='embeddablePanelTitle'] mark {
      color: ${euiTheme.colors.textAccent};
      background-color: ${euiTheme.colors.backgroundLightAccent};
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
    exploreInDiscoverTab: onExploreInDiscoverTab
      ? { onClick: handleExploreInDiscoverTab }
      : undefined,
  });

  const disabledActions = [...DEFAULT_DISABLED_ACTIONS, ...extraDisabledActions];

  return (
    <div css={chartCss}>
      <PresentationPanelQuickActionContext.Provider
        value={{ view: [ACTION_EXPLORE_IN_DISCOVER_TAB, 'openInspector'] }}
      >
        <EmbeddableComponent
          {...lensProps}
          title={lensProps.attributes.title}
          titleHighlight={titleHighlight}
          extraActions={extraActions}
          abortController={abortController}
          disabledActions={disabledActions}
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
