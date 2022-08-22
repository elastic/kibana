/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';

import { EuiContextMenuItem } from '@elastic/eui';
import { toMountPoint } from '@kbn/kibana-react-plugin/public';
import { OverlayRef } from '@kbn/core/public';

import { pluginServices } from '../../services';
import { ControlGroupContainer } from '..';
import { ControlGroupStrings } from '../control_group_strings';
import { setFlyoutRef } from '../embeddable/control_group_container';
import { ControlGroupEditor } from './control_group_editor';

export interface EditControlGroupButtonProps {
  controlGroupContainer: ControlGroupContainer;
  closePopover: () => void;
}

export const EditControlGroup = ({
  controlGroupContainer,
  closePopover,
}: EditControlGroupButtonProps) => {
  const { overlays, theme } = pluginServices.getHooks();
  const { openConfirm, openFlyout } = overlays.useService();
  const themeService = theme.useService();

  const editControlGroup = () => {
    const onDeleteAll = (ref: OverlayRef) => {
      openConfirm(ControlGroupStrings.management.deleteControls.getSubtitle(), {
        buttonColor: 'danger',
        cancelButtonText: ControlGroupStrings.management.deleteControls.getCancel(),
        confirmButtonText: ControlGroupStrings.management.deleteControls.getConfirm(),
        title: ControlGroupStrings.management.deleteControls.getDeleteAllTitle(),
      }).then((confirmed) => {
        if (confirmed)
          Object.keys(controlGroupContainer.getInput().panels).forEach((panelId) =>
            controlGroupContainer.removeEmbeddable(panelId)
          );
        ref.close();
      });
    };

    const flyoutInstance = openFlyout(
      toMountPoint(
        <ControlGroupEditor
          controlCount={Object.keys(controlGroupContainer.getInput().panels ?? {}).length}
          initialInput={controlGroupContainer.getInput()}
          onClose={() => flyoutInstance.close()}
          onDeleteAll={() => onDeleteAll(flyoutInstance)}
          updateInput={(changes) => controlGroupContainer.updateInput(changes)}
        />,
        { theme$: themeService.theme$ }
      ),
      {
        onClose: () => {
          flyoutInstance.close();
          setFlyoutRef(undefined);
        },
        outsideClickCloses: false,
      }
    );
    setFlyoutRef(flyoutInstance);
  };

  const commonButtonProps = {
    key: 'manageControls',
    icon: 'gear',
    'aria-label': ControlGroupStrings.management.getManageButtonTitle(),
    'data-test-subj': 'controls-settings-button',
    onClick: () => {
      editControlGroup();
      closePopover();
    },
  };

  return (
    <EuiContextMenuItem {...commonButtonProps}>
      {ControlGroupStrings.management.getManageButtonTitle()}
    </EuiContextMenuItem>
  );
};
