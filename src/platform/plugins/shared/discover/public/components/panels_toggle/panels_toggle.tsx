/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback } from 'react';
import { i18n } from '@kbn/i18n';
import useObservable from 'react-use/lib/useObservable';
import type { BehaviorSubject } from 'rxjs';
import { IconButtonGroup } from '@kbn/shared-ux-button-toolbar';
import { useAppStateSelector } from '../../application/main/state_management/redux';
import type { SidebarToggleState } from '../../application/types';
import { VIEW_MODE } from '../../../common/constants';
import {
  internalStateActions,
  useCurrentTabAction,
  useInternalStateDispatch,
} from '../../application/main/state_management/redux';

export interface PanelsToggleProps {
  sidebarToggleState$: BehaviorSubject<SidebarToggleState>;
  renderedFor: 'histogram' | 'prompt' | 'tabs' | 'root';
  isChartAvailable: boolean | undefined; // it will be injected in `DiscoverMainContent` when rendering View mode tabs or in `DiscoverLayout` when rendering No results or Error prompt
}

/**
 * An element of this component is created in DiscoverLayout
 * @param stateContainer
 * @param sidebarToggleState$
 * @param renderedIn
 * @param isChartAvailable
 * @constructor
 */
export const PanelsToggle: React.FC<PanelsToggleProps> = ({
  sidebarToggleState$,
  renderedFor,
  isChartAvailable,
}) => {
  const dispatch = useInternalStateDispatch();
  const updateAppState = useCurrentTabAction(internalStateActions.updateAppState);
  const isChartHidden = useAppStateSelector((state) => Boolean(state.hideChart));
  const isTableHidden = useAppStateSelector((state) => Boolean(state.hideDataTable));
  const viewMode = useAppStateSelector((state) => state.viewMode ?? VIEW_MODE.DOCUMENT_LEVEL);

  // Mutual exclusion: you can't collapse both chart and table at the same time.
  // If one is collapsed and the user collapses the other, it acts as a swap/toggle:
  // the collapsed one opens while the other one closes.
  const isInDocumentView = viewMode === VIEW_MODE.DOCUMENT_LEVEL;

  const onToggleChart = useCallback(() => {
    const willHideChart = !isChartHidden;
    if (willHideChart && isTableHidden && isInDocumentView) {
      // Swap: hide chart, show table
      dispatch(updateAppState({ appState: { hideChart: true, hideDataTable: false } }));
    } else {
      dispatch(updateAppState({ appState: { hideChart: willHideChart } }));
    }
  }, [dispatch, isChartHidden, isTableHidden, isInDocumentView, updateAppState]);

  const onToggleTable = useCallback(() => {
    const willHideTable = !isTableHidden;
    if (willHideTable && isChartHidden && isChartAvailable) {
      // Swap: hide table, show chart
      dispatch(updateAppState({ appState: { hideDataTable: true, hideChart: false } }));
    } else {
      dispatch(updateAppState({ appState: { hideDataTable: willHideTable } }));
    }
  }, [dispatch, isTableHidden, isChartHidden, isChartAvailable, updateAppState]);

  const sidebarToggleState = useObservable(sidebarToggleState$);
  const isSidebarCollapsed = sidebarToggleState?.isCollapsed ?? false;

  const isInsideHistogram = renderedFor === 'histogram';
  const isInsideDiscoverContent = !isInsideHistogram;
  const isInTabsContext = renderedFor === 'tabs' || renderedFor === 'root';

  // Chart toggle: show in histogram when chart visible, OR in tabs only when chart is hidden
  // (avoids duplicate when both chart toolbar and hits area would show it)
  const showChartToggle =
    isInsideHistogram || (isInsideDiscoverContent && isChartHidden);

  // Table toggle: only in tabs context when in document view and chart is available,
  // since collapsing the table requires a chart to expand into
  const showTableToggle =
    isInTabsContext && viewMode === VIEW_MODE.DOCUMENT_LEVEL && isChartAvailable;

  const buttons = [
    ...((isInsideHistogram && isSidebarCollapsed) ||
    (isInsideDiscoverContent && isSidebarCollapsed && (isChartHidden || !isChartAvailable))
      ? [
          {
            label: i18n.translate('discover.panelsToggle.showSidebarButton', {
              defaultMessage: 'Show sidebar',
            }),
            iconType: 'transitionLeftIn',
            'data-test-subj': 'dscShowSidebarButton',
            'aria-expanded': !isSidebarCollapsed,
            'aria-controls': 'discover-sidebar',
            onClick: () => sidebarToggleState?.toggle?.(false),
          },
        ]
      : []),
    ...(showChartToggle
      ? [
          {
            label: isChartHidden
              ? i18n.translate('discover.panelsToggle.showChartButton', {
                  defaultMessage: 'Show chart',
                })
              : i18n.translate('discover.panelsToggle.hideChartButton', {
                  defaultMessage: 'Hide chart',
                }),
            iconType: isChartHidden ? 'transitionTopIn' : 'transitionTopOut',
            'data-test-subj': isChartHidden ? 'dscShowHistogramButton' : 'dscHideHistogramButton',
            'aria-expanded': !isChartHidden,
            'aria-controls': 'unifiedHistogramCollapsablePanel',
            onClick: onToggleChart,
          },
        ]
      : []),
    ...(showTableToggle
      ? [
          {
            label: isTableHidden
              ? i18n.translate('discover.panelsToggle.showTableButton', {
                  defaultMessage: 'Show table',
                })
              : i18n.translate('discover.panelsToggle.hideTableButton', {
                  defaultMessage: 'Hide table',
                }),
            iconType: isTableHidden ? 'transitionTopOut' : 'transitionTopIn',
            'data-test-subj': isTableHidden ? 'dscShowTableButton' : 'dscHideTableButton',
            'aria-expanded': !isTableHidden,
            'aria-controls': 'discoverDocTable',
            onClick: onToggleTable,
          },
        ]
      : []),
  ];

  if (!buttons.length) {
    return null;
  }

  return (
    <IconButtonGroup
      data-test-subj={`dscPanelsToggle${isInsideHistogram ? 'InHistogram' : 'InPage'}`}
      legend={i18n.translate('discover.panelsToggle.panelsVisibilityLegend', {
        defaultMessage: 'Panels visibility',
      })}
      buttonSize="s"
      buttons={buttons}
    />
  );
};
