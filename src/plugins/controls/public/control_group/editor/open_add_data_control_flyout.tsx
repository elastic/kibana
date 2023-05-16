/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { toMountPoint } from '@kbn/kibana-react-plugin/public';
import { isErrorEmbeddable } from '@kbn/embeddable-plugin/public';

import {
  ControlGroupContainer,
  ControlGroupContainerContext,
  setFlyoutRef,
} from '../embeddable/control_group_container';
import type {
  AddDataControlProps,
  AddOptionsListControlProps,
  AddRangeSliderControlProps,
} from '../external_api/control_group_input_builder';
import {
  DEFAULT_CONTROL_GROW,
  DEFAULT_CONTROL_WIDTH,
} from '../../../common/control_group/control_group_constants';
import { pluginServices } from '../../services';
import { ControlEditor } from './control_editor';
import { IEditableControlFactory } from '../../types';
import { ControlInputTransform } from '../../../common/types';
import { ControlGroupStrings } from '../control_group_strings';
import { DataControlInput, OPTIONS_LIST_CONTROL, RANGE_SLIDER_CONTROL } from '../..';

export function openAddDataControlFlyout(
  this: ControlGroupContainer,
  options?: {
    controlInputTransform?: ControlInputTransform;
    onSave?: (id: string) => void;
  }
) {
  const { controlInputTransform, onSave } = options || {};
  const {
    overlays: { openFlyout, openConfirm },
    controls: { getControlFactory },
    theme: { theme$ },
  } = pluginServices.getServices();

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
      <ControlGroupContainerContext.Provider value={this}>
        <ControlEditor
          setLastUsedDataViewId={(newId) => this.setLastUsedDataViewId(newId)}
          getRelevantDataViewId={this.getMostRelevantDataViewId}
          isCreate={true}
          width={this.getInput().defaultControlWidth ?? DEFAULT_CONTROL_WIDTH}
          grow={this.getInput().defaultControlGrow ?? DEFAULT_CONTROL_GROW}
          updateTitle={(newTitle) => (controlInput.title = newTitle)}
          updateWidth={(defaultControlWidth) => this.updateInput({ defaultControlWidth })}
          updateGrow={(defaultControlGrow: boolean) => this.updateInput({ defaultControlGrow })}
          onSave={async (type) => {
            this.closeAllFlyouts();
            if (!type) {
              return;
            }

            const factory = getControlFactory(type) as IEditableControlFactory;
            if (factory.presaveTransformFunction) {
              controlInput = factory.presaveTransformFunction(controlInput);
            }

            if (controlInputTransform) {
              controlInput = controlInputTransform({ ...controlInput }, type);
            }

            let newControl;

            switch (type) {
              case OPTIONS_LIST_CONTROL:
                newControl = await this.addOptionsListControl(
                  controlInput as AddOptionsListControlProps
                );
                break;
              case RANGE_SLIDER_CONTROL:
                newControl = await this.addRangeSliderControl(
                  controlInput as AddRangeSliderControlProps
                );
                break;
              default:
                newControl = await this.addDataControlFromField(
                  controlInput as AddDataControlProps
                );
            }

            if (onSave && !isErrorEmbeddable(newControl)) {
              onSave(newControl.id);
            }
          }}
          onCancel={onCancel}
          onTypeEditorChange={(partialInput) =>
            (controlInput = { ...controlInput, ...partialInput })
          }
        />
      </ControlGroupContainerContext.Provider>,
      { theme$ }
    ),
    {
      'aria-label': ControlGroupStrings.manageControl.getFlyoutCreateTitle(),
      outsideClickCloses: false,
      onClose: () => {
        onCancel();
      },
      // @ts-ignore - TODO: Remove this once https://github.com/elastic/eui/pull/6645 lands in Kibana
      focusTrapProps: { scrollLock: true },
    }
  );
  setFlyoutRef(flyoutInstance);
}
