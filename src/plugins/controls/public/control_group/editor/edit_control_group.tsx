/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import fastIsEqual from 'fast-deep-equal';
import { EuiContextMenuItem } from '@elastic/eui';

import { toMountPoint } from '@kbn/kibana-react-plugin/public';
import { OverlayRef } from '@kbn/core/public';
import { ControlGroupStrings } from '../control_group_strings';
import { ControlGroupEditor } from './control_group_editor';
import { pluginServices } from '../../services';
import { ControlGroupContainer, ControlGroupInput } from '..';
import { setFlyoutRef } from '../embeddable/control_group_container';
import { ControlPanelState, ControlsPanels } from '../types';

export interface EditControlGroupButtonProps {
  controlGroupContainer: ControlGroupContainer;
  closePopover: () => void;
}

const editorControlGroupInputIsEqual = (a: ControlGroupInput, b: ControlGroupInput) =>
  fastIsEqual(a, b);

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

    const onClose = (ref: OverlayRef, newInput?: ControlGroupInput) => {
      if (!newInput) {
        ref.close();
        return;
      }

      const controlCount = Object.keys(controlGroupContainer.getInput().panels ?? {}).length;
      const initialInput = controlGroupContainer.getInput();
      if (controlCount > 0 && newInput.defaultControlWidth !== initialInput.defaultControlWidth) {
        openConfirm(ControlGroupStrings.management.applyDefaultSize.getSubtitle(), {
          confirmButtonText: ControlGroupStrings.management.applyDefaultSize.getConfirm(),
          cancelButtonText: ControlGroupStrings.management.applyDefaultSize.getCancel(),
          title: ControlGroupStrings.management.applyDefaultSize.getTitle(),
        }).then((confirmed) => {
          if (confirmed) {
            const newPanels = {} as ControlsPanels;
            Object.entries(initialInput.panels).forEach(
              ([id, panel]) =>
                (newPanels[id] = {
                  ...panel,
                  width: newInput.defaultControlWidth,
                  grow: newInput.defaultControlGrow,
                } as ControlPanelState)
            );
            newInput.panels = newPanels;
          }
          ref.close();
          controlGroupContainer.updateInput(newInput);
        });
      } else if (!editorControlGroupInputIsEqual(newInput, initialInput)) {
        ref.close();
        controlGroupContainer.updateInput(newInput);
      }
    };

    const flyoutInstance = openFlyout(
      toMountPoint(
        <PresentationUtilProvider>
          <ControlGroupEditor
            initialInput={controlGroupContainer.getInput()}
            controlCount={Object.keys(controlGroupContainer.getInput().panels ?? {}).length}
            onDeleteAll={() => onDeleteAll(flyoutInstance)}
            onClose={(newInput?: ControlGroupInput) => onClose(flyoutInstance, newInput)}
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
