/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { EuiContextMenuPanel } from '@elastic/eui';
import { SolutionToolbarPopover } from '@kbn/presentation-util-plugin/public';
import { getControlButtonTitle } from '../../_dashboard_app_strings';

export function ControlsToolbarButton({ controlGroup }: { controlGroup: ControlGroupContainer; }) {

  return (
    <SolutionToolbarPopover
      ownFocus
      label={getControlButtonTitle()}
      iconType="arrowDown"
      iconSide="right"
      panelPaddingSize="none"
      data-test-subj="dashboard-controls-menu-button"
    >
      {({ closePopover }: { closePopover: () => void }) => (
        <EuiContextMenuPanel
          items={[
            controlGroup.getCreateControlButton('toolbar', closePopover),
            controlGroup.getCreateTimeSliderControlButton(closePopover),
            controlGroup.getEditControlGroupButton(closePopover),
          ]}
        />
      )}
    </SolutionToolbarPopover>
  );
}
