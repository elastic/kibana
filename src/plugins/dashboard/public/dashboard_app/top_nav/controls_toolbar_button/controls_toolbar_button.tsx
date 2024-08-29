/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';

import { EuiContextMenuPanel, useEuiTheme } from '@elastic/eui';
import { ToolbarPopover } from '@kbn/shared-ux-button-toolbar';

import { ControlGroupApi } from '@kbn/controls-plugin/public';
import { getControlButtonTitle } from '../../_dashboard_app_strings';
import { AddDataControlButton } from './add_data_control_button';
import { AddTimeSliderControlButton } from './add_time_slider_control_button';
import { EditControlGroupButton } from './edit_control_group_button';

export function ControlsToolbarButton({
  controlGroupApi,
  isDisabled,
}: {
  controlGroupApi?: ControlGroupApi;
  isDisabled?: boolean;
}) {
  const { euiTheme } = useEuiTheme();

  return (
    <ToolbarPopover
      ownFocus
      repositionOnScroll
      panelPaddingSize="none"
      label={getControlButtonTitle()}
      zIndex={Number(euiTheme.levels.header) - 1}
      size="s"
      iconType="controlsHorizontal"
      data-test-subj="dashboard-controls-menu-button"
      isDisabled={isDisabled}
    >
      {({ closePopover }: { closePopover: () => void }) => (
        <EuiContextMenuPanel
          items={[
            <AddDataControlButton
              key="addControl"
              controlGroupApi={controlGroupApi}
              closePopover={closePopover}
            />,
            <AddTimeSliderControlButton
              key="addTimeSliderControl"
              controlGroupApi={controlGroupApi}
              closePopover={closePopover}
            />,
            <EditControlGroupButton
              key="manageControls"
              controlGroupApi={controlGroupApi}
              closePopover={closePopover}
            />,
          ]}
        />
      )}
    </ToolbarPopover>
  );
}
