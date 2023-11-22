/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useCallback } from 'react';
import { EuiFlexItem } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { IconButtonGroup } from '@kbn/shared-ux-button-toolbar';
import { useAppStateSelector } from '../../application/main/services/discover_app_state_container';
import { DiscoverStateContainer } from '../../application/main/services/discover_state';

export interface PanelsToggleProps {
  stateContainer: DiscoverStateContainer;
}

export const PanelsToggle: React.FC<PanelsToggleProps> = ({ stateContainer }) => {
  const isChartHidden = useAppStateSelector((state) => Boolean(state.hideChart));

  const onShowChart = useCallback(() => {
    stateContainer.appState.update({ hideChart: false });
  }, [stateContainer]);

  if (!isChartHidden) {
    return null;
  }

  return (
    <EuiFlexItem grow={false}>
      <IconButtonGroup
        legend={i18n.translate('discover.panelsToggle.panelsVisibilityLegend', {
          defaultMessage: 'Panels visibility',
        })}
        buttonSize="s"
        buttons={[
          {
            label: i18n.translate('discover.panelsToggle.showChartButton', {
              defaultMessage: 'Show chart',
            }),
            iconType: 'transitionTopIn',
            'data-test-subj': 'dscShowChartButton',
            onClick: onShowChart,
          },
        ]}
      />
    </EuiFlexItem>
  );
};
