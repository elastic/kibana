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
import { BehaviorSubject } from 'rxjs';
import { IconButtonGroup } from '@kbn/shared-ux-button-toolbar';
import { useAppStateSelector } from '../../application/main/state_management/discover_app_state_container';
import { DiscoverStateContainer } from '../../application/main/state_management/discover_state';
import { SidebarToggleState } from '../../application/types';

export interface PanelsToggleProps {
  stateContainer: DiscoverStateContainer;
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
  stateContainer,
  sidebarToggleState$,
  renderedFor,
  isChartAvailable,
}) => {
  const isChartHidden = useAppStateSelector((state) => Boolean(state.hideChart));

  const onToggleChart = useCallback(() => {
    stateContainer.appState.update({ hideChart: !isChartHidden });
  }, [stateContainer, isChartHidden]);

  const sidebarToggleState = useObservable(sidebarToggleState$);
  const isSidebarCollapsed = sidebarToggleState?.isCollapsed ?? false;

  const isInsideHistogram = renderedFor === 'histogram';
  const isInsideDiscoverContent = !isInsideHistogram;

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
    ...(isInsideHistogram || (isInsideDiscoverContent && isChartAvailable && isChartHidden)
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
