/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import React, { useCallback, useMemo } from 'react';
import { useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { PresentationPanelQuickActionContext } from '@kbn/presentation-panel-plugin/public';
import type { LensProps } from './hooks/use_lens_props';
import { useLensExtraActions } from './hooks/use_lens_extra_actions';
import { resolveEsqlVariables } from './helpers/resolve_esql_variables';
import {
  ACTION_COPY_TO_DASHBOARD,
  ACTION_EXPLORE_IN_DISCOVER_TAB,
  ACTION_VIEW_DETAILS,
} from '../../common/constants';
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

    & .echLegend .echLegendGridList {
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

  const resolvedQuery = useMemo(
    () => resolveEsqlVariables(lensProps.attributes.state.query, lensProps.esqlVariables),
    [lensProps.attributes.state.query, lensProps.esqlVariables]
  );

  const handleExploreInDiscoverTab = useCallback(
    () =>
      onExploreInDiscoverTab?.({
        query: resolvedQuery,
        tabLabel: lensProps.attributes.title,
        timeRange: lensProps.timeRange,
      }),
    [resolvedQuery, lensProps.attributes.title, lensProps.timeRange, onExploreInDiscoverTab]
  );

  const extraActions = useLensExtraActions({
    copyToDashboard: onCopyToDashboard ? { onClick: onCopyToDashboard } : undefined,
    viewDetails: onViewDetails ? { onClick: onViewDetails } : undefined,
    exploreInDiscoverTab: onExploreInDiscoverTab
      ? { onClick: handleExploreInDiscoverTab }
      : undefined,
  });

  const disabledActions = [...DEFAULT_DISABLED_ACTIONS, ...extraDisabledActions];

  /*
   * The visible quick-action row for metrics-grid panels (issue #236787).
   *
   * The list is prop-keyed: View details and Copy to dashboard are promoted to
   * the visible row only when the parent wired their handlers. The traces grid
   * (latency / throughput / error_rate) does not pass these handlers, so its
   * visible row remains [Explore, Inspect] unchanged.
   *
   * Inspect ('openInspector') stays in the visible row here even though the
   * desired end-state is to demote it to the popover. Lens auto-injects Inspect
   * into the default action set, and the public LensRenderer contract (see
   * x-pack/platform/plugins/shared/lens/public/react_embeddable/renderer/lens_custom_renderer_component.tsx:142-157)
   * only *appends* extraActions to defaults; it offers no way to suppress or
   * replace a default by id. Demoting Inspect, and adding dividers between
   * groupings, requires a follow-up from @elastic/kibana-visualizations.
   */
  // The context typing expects an 8-slot tuple of optional strings
  // (PresentationPanelQuickActionIds.view -> QuickActionIds). The type isn't
  // re-exported from the plugin's public entry, and we know our list never
  // exceeds 4 ids, so we cast through a tuple shape here.
  const quickActionView = useMemo(() => {
    const ids: Array<string | undefined> = [ACTION_EXPLORE_IN_DISCOVER_TAB];
    if (onViewDetails) {
      ids.push(ACTION_VIEW_DETAILS);
    }
    if (onCopyToDashboard) {
      ids.push(ACTION_COPY_TO_DASHBOARD);
    }
    ids.push('openInspector');
    return ids as [string?, string?, string?, string?, string?, string?, string?, string?];
  }, [onViewDetails, onCopyToDashboard]);

  return (
    <div css={chartCss}>
      <PresentationPanelQuickActionContext.Provider value={{ view: quickActionView }}>
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
