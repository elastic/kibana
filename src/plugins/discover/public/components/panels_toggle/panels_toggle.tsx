/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useCallback } from 'react';
import { i18n } from '@kbn/i18n';
import { IconButtonGroup } from '@kbn/shared-ux-button-toolbar';
import { useAppStateSelector } from '../../application/main/services/discover_app_state_container';
import { DiscoverStateContainer } from '../../application/main/services/discover_state';

export interface PanelsToggleProps {
  stateContainer: DiscoverStateContainer;
  isSidebarCollapsed: boolean;
  onToggleSidebar: (isSidebarCollapsed: boolean) => void;
}

export const PanelsToggle: React.FC<PanelsToggleProps> = ({
  stateContainer,
  isSidebarCollapsed,
  onToggleSidebar,
}) => {
  const isChartHidden = useAppStateSelector((state) => Boolean(state.hideChart));

  const onToggleChart = useCallback(() => {
    stateContainer.appState.update({ hideChart: !isChartHidden });
  }, [stateContainer, isChartHidden]);

  return (
    <IconButtonGroup
      legend={i18n.translate('discover.panelsToggle.panelsVisibilityLegend', {
        defaultMessage: 'Panels visibility',
      })}
      buttonSize="s"
      buttons={[
        ...(isSidebarCollapsed
          ? [
              {
                label: i18n.translate('discover.panelsToggle.showSidebarButton', {
                  defaultMessage: 'Show sidebar',
                }),
                iconType: 'transitionLeftIn',
                'data-test-subj': 'dscShowSidebarButton',
                onClick: () => onToggleSidebar(false),
              },
            ]
          : []),
        {
          label: isChartHidden
            ? i18n.translate('discover.panelsToggle.showChartButton', {
                defaultMessage: 'Show chart',
              })
            : i18n.translate('discover.panelsToggle.hideChartButton', {
                defaultMessage: 'Hide chart',
              }),
          iconType: isChartHidden ? 'transitionTopIn' : 'transitionTopOut',
          'data-test-subj': 'dscToggleHistogramButton',
          onClick: onToggleChart,
        },
      ]}
    />
  );
};
