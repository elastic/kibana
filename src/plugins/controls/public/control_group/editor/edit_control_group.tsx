/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { EuiContextMenuItem } from '@elastic/eui';

import { DEFAULT_CONTROL_WIDTH, DEFAULT_CONTROL_STYLE } from './editor_constants';
import { ControlsPanels } from '../types';
import { pluginServices } from '../../services';
import { ControlStyle, ControlWidth } from '../../types';
import { ControlGroupStrings } from '../control_group_strings';
import { toMountPoint } from '../../../../kibana_react/public';
import { OverlayRef } from '../../../../../core/public';
import { ControlGroupEditor } from './control_group_editor';

export interface EditControlGroupButtonProps {
  controlStyle: ControlStyle;
  panels?: ControlsPanels;
  defaultControlWidth?: ControlWidth;
  setControlStyle: (setControlStyle: ControlStyle) => void;
  setDefaultControlWidth: (defaultControlWidth: ControlWidth) => void;
  setAllControlWidths: (defaultControlWidth: ControlWidth) => void;
  removeEmbeddable?: (panelId: string) => void;
  closePopover: () => void;
}

export const EditControlGroup = ({
  panels,
  defaultControlWidth,
  controlStyle,
  setControlStyle,
  setDefaultControlWidth,
  setAllControlWidths,
  removeEmbeddable,
  closePopover,
}: EditControlGroupButtonProps) => {
  const { overlays } = pluginServices.getServices();
  const { openConfirm, openFlyout } = overlays;

  const editControlGroup = () => {
    const PresentationUtilProvider = pluginServices.getContextProvider();

    const onCancel = (ref: OverlayRef) => {
      if (!removeEmbeddable || !panels) return;
      openConfirm(ControlGroupStrings.management.deleteControls.getSubtitle(), {
        confirmButtonText: ControlGroupStrings.management.deleteControls.getConfirm(),
        cancelButtonText: ControlGroupStrings.management.deleteControls.getCancel(),
        title: ControlGroupStrings.management.deleteControls.getDeleteAllTitle(),
        buttonColor: 'danger',
      }).then((confirmed) => {
        if (confirmed) Object.keys(panels).forEach((panelId) => removeEmbeddable(panelId));
        ref.close();
      });
    };

    const flyoutInstance = openFlyout(
      toMountPoint(
        <PresentationUtilProvider>
          <ControlGroupEditor
            width={defaultControlWidth ?? DEFAULT_CONTROL_WIDTH}
            controlStyle={controlStyle ?? DEFAULT_CONTROL_STYLE}
            setAllWidths={false}
            controlCount={Object.keys(panels ?? {}).length}
            updateControlStyle={setControlStyle}
            updateWidth={setDefaultControlWidth}
            updateAllControlWidths={setAllControlWidths}
            onCancel={() => onCancel(flyoutInstance)}
            onClose={() => flyoutInstance.close()}
          />
        </PresentationUtilProvider>
      ),
      {
        onClose: () => flyoutInstance.close(),
      }
    );
  };

  const commonButtonProps = {
    key: 'manageControls',
    onClick: () => {
      editControlGroup();
      closePopover();
    },
    icon: 'gear',
    'data-test-subj': 'controls-settings-button',
    'aria-label': ControlGroupStrings.management.getManageButtonTitle(),
  };

  return (
    <EuiContextMenuItem {...commonButtonProps}>
      {ControlGroupStrings.management.getManageButtonTitle()}
    </EuiContextMenuItem>
  );
};
