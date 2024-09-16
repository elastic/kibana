/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { OverlayRef } from '@kbn/core-mount-utils-browser';
import { toMountPoint } from '@kbn/react-kibana-mount';
import React from 'react';

import { pluginServices } from '../../services';
import { ControlGroupStrings } from '../control_group_strings';
import {
  ControlGroupContainer,
  ControlGroupContainerContext,
  setFlyoutRef,
} from '../embeddable/control_group_container';
import { ControlGroupEditor } from './control_group_editor';

export function openEditControlGroupFlyout(this: ControlGroupContainer) {
  const {
    core: { theme, i18n },
    overlays: { openFlyout, openConfirm },
  } = pluginServices.getServices();

  const onDeleteAll = (ref: OverlayRef) => {
    openConfirm(ControlGroupStrings.management.deleteControls.getSubtitle(), {
      confirmButtonText: ControlGroupStrings.management.deleteControls.getConfirm(),
      cancelButtonText: ControlGroupStrings.management.deleteControls.getCancel(),
      title: ControlGroupStrings.management.deleteControls.getDeleteAllTitle(),
      buttonColor: 'danger',
    }).then((confirmed) => {
      if (confirmed)
        Object.keys(this.getInput().panels).forEach((panelId) => this.removeEmbeddable(panelId));
      ref.close();
    });
  };

  const flyoutInstance = openFlyout(
    toMountPoint(
      <ControlGroupContainerContext.Provider value={this}>
        <ControlGroupEditor
          initialInput={this.getInput()}
          updateInput={(changes) => this.updateInput(changes)}
          controlCount={Object.keys(this.getInput().panels ?? {}).length}
          onDeleteAll={() => onDeleteAll(flyoutInstance)}
          onClose={() => flyoutInstance.close()}
        />
      </ControlGroupContainerContext.Provider>,
      { theme, i18n }
    ),
    {
      size: 's',
      'aria-label': ControlGroupStrings.manageControl.getFlyoutCreateTitle(),
      outsideClickCloses: false,
      onClose: () => {
        this.closeAllFlyouts();
      },
    }
  );
  setFlyoutRef(flyoutInstance);
}
