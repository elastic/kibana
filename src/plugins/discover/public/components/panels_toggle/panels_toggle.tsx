/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useCallback } from 'react';
import { i18n } from '@kbn/i18n';
import useObservable from 'react-use/lib/useObservable';
import { BehaviorSubject } from 'rxjs';
import { IconButtonGroup } from '@kbn/shared-ux-button-toolbar';
import { useAppStateSelector } from '../../application/main/services/discover_app_state_container';
import { DiscoverStateContainer } from '../../application/main/services/discover_state';
import { SidebarToggleState } from '../../application/types';

export interface PanelsToggleProps {
  stateContainer: DiscoverStateContainer;
  sidebarToggleState$: BehaviorSubject<SidebarToggleState>;
  isChartAvailable?: boolean; // it will be injected in `DiscoverMainContent` when rendering view mode tabs
}

export const PanelsToggle: React.FC<PanelsToggleProps> = ({
  stateContainer,
  sidebarToggleState$,
  isChartAvailable,
}) => {
  const isChartHidden = useAppStateSelector((state) => Boolean(state.hideChart));

  const onToggleChart = useCallback(() => {
    stateContainer.appState.update({ hideChart: !isChartHidden });
  }, [stateContainer, isChartHidden]);

  const sidebarToggleState = useObservable(sidebarToggleState$);
  const isSidebarCollapsed = sidebarToggleState?.isCollapsed ?? false;

  const isInsideHistogram = typeof isChartAvailable === 'undefined';
  const isInsideTabs = typeof isChartAvailable === 'boolean';

  const buttons = [
    ...((isInsideHistogram && isSidebarCollapsed) ||
    (isInsideTabs && isSidebarCollapsed && (isChartHidden || !isChartAvailable))
      ? [
          {
            label: i18n.translate('discover.panelsToggle.showSidebarButton', {
              defaultMessage: 'Show sidebar',
            }),
            iconType: 'transitionLeftIn',
            'data-test-subj': 'dscShowSidebarButton',
            onClick: () => sidebarToggleState?.toggle?.(false),
          },
        ]
      : []),
    ...(isInsideHistogram || (isInsideTabs && isChartAvailable && isChartHidden)
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
      data-test-subj={`dscPanelsToggle${isInsideHistogram ? 'InHistogram' : 'InTabs'}`}
      legend={i18n.translate('discover.panelsToggle.panelsVisibilityLegend', {
        defaultMessage: 'Panels visibility',
      })}
      buttonSize="s"
      buttons={buttons}
    />
  );
};
