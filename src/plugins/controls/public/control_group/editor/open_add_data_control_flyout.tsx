/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { toMountPoint } from '@kbn/kibana-react-plugin/public';
import type {
  AddDataControlProps,
  AddOptionsListControlProps,
  AddRangeSliderControlProps,
} from '../control_group_input_builder';
import { ControlGroupStrings } from '../control_group_strings';
import { ControlGroupContainer, setFlyoutRef } from '../embeddable/control_group_container';
import { pluginServices } from '../../services';
import { ControlEditor } from './control_editor';
import { DataControlInput, OPTIONS_LIST_CONTROL, RANGE_SLIDER_CONTROL } from '../..';
import { IEditableControlFactory } from '../../types';
import {
  DEFAULT_CONTROL_GROW,
  DEFAULT_CONTROL_WIDTH,
} from '../../../common/control_group/control_group_constants';

export function openAddDataControlFlyout(this: ControlGroupContainer) {
  const {
    overlays: { openFlyout, openConfirm },
    controls: { getControlFactory },
    theme: { theme$ },
  } = pluginServices.getServices();
  const ControlsServicesProvider = pluginServices.getContextProvider();

  let controlInput: Partial<DataControlInput> = {};
  const onCancel = () => {
    if (Object.keys(controlInput).length === 0) {
      this.closeAllFlyouts();
      return;
    }

    openConfirm(ControlGroupStrings.management.discardNewControl.getSubtitle(), {
      confirmButtonText: ControlGroupStrings.management.discardNewControl.getConfirm(),
      cancelButtonText: ControlGroupStrings.management.discardNewControl.getCancel(),
      title: ControlGroupStrings.management.discardNewControl.getTitle(),
      buttonColor: 'danger',
    }).then((confirmed) => {
      if (confirmed) {
        this.closeAllFlyouts();
      }
    });
  };

  const flyoutInstance = openFlyout(
    toMountPoint(
      <ControlsServicesProvider>
        <ControlEditor
          setLastUsedDataViewId={(newId) => this.setLastUsedDataViewId(newId)}
          getRelevantDataViewId={this.getMostRelevantDataViewId}
          isCreate={true}
          width={this.getInput().defaultControlWidth ?? DEFAULT_CONTROL_WIDTH}
          grow={this.getInput().defaultControlGrow ?? DEFAULT_CONTROL_GROW}
          updateTitle={(newTitle) => (controlInput.title = newTitle)}
          updateWidth={(defaultControlWidth) => this.updateInput({ defaultControlWidth })}
          updateGrow={(defaultControlGrow: boolean) => this.updateInput({ defaultControlGrow })}
          onSave={(type) => {
            this.closeAllFlyouts();
            if (!type) {
              return;
            }

            const factory = getControlFactory(type) as IEditableControlFactory;
            if (factory.presaveTransformFunction) {
              controlInput = factory.presaveTransformFunction(controlInput);
            }

            if (type === OPTIONS_LIST_CONTROL) {
              this.addOptionsListControl(controlInput as AddOptionsListControlProps);
              return;
            }

            if (type === RANGE_SLIDER_CONTROL) {
              this.addRangeSliderControl(controlInput as AddRangeSliderControlProps);
              return;
            }

            this.addDataControlFromField(controlInput as AddDataControlProps);
          }}
          onCancel={onCancel}
          onTypeEditorChange={(partialInput) =>
            (controlInput = { ...controlInput, ...partialInput })
          }
        />
      </ControlsServicesProvider>,
      { theme$ }
    ),
    {
      'aria-label': ControlGroupStrings.manageControl.getFlyoutCreateTitle(),
      outsideClickCloses: false,
      onClose: () => {
        onCancel();
      },
    }
  );
  setFlyoutRef(flyoutInstance);
}
