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
import { ControlGroupStrings } from '../control_group_strings';
import { ControlGroupEditor } from './control_group_editor';
import { pluginServices } from '../../services';
import { ControlGroupContainer } from '..';
import { setFlyoutRef } from '../embeddable/control_group_container';

export interface EditControlGroupButtonProps {
  controlGroupContainer: ControlGroupContainer;
  closePopover: () => void;
}

export const EditControlGroup = ({
  controlGroupContainer,
  closePopover,
}: EditControlGroupButtonProps) => {
  const { overlays } = pluginServices.getServices();
  const { openConfirm, openFlyout } = overlays;

  const editControlGroup = () => {
    const PresentationUtilProvider = pluginServices.getContextProvider();

    const onDeleteAll = (ref: OverlayRef) => {
      openConfirm(ControlGroupStrings.management.deleteControls.getSubtitle(), {
        confirmButtonText: ControlGroupStrings.management.deleteControls.getConfirm(),
        cancelButtonText: ControlGroupStrings.management.deleteControls.getCancel(),
        title: ControlGroupStrings.management.deleteControls.getDeleteAllTitle(),
        buttonColor: 'danger',
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
        <PresentationUtilProvider>
          <ControlGroupEditor
            initialInput={controlGroupContainer.getInput()}
            updateInput={(changes) => controlGroupContainer.updateInput(changes)}
            controlCount={Object.keys(controlGroupContainer.getInput().panels ?? {}).length}
            onDeleteAll={() => onDeleteAll(flyoutInstance)}
            onClose={() => flyoutInstance.close()}
          />
        </PresentationUtilProvider>
      ),
      {
        outsideClickCloses: false,
        onClose: () => {
          flyoutInstance.close();
          setFlyoutRef(undefined);
        },
      }
    );
    setFlyoutRef(flyoutInstance);
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
