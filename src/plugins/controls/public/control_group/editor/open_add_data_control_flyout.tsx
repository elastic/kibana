/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { batch } from 'react-redux';

import { isErrorEmbeddable } from '@kbn/embeddable-plugin/public';
import { toMountPoint } from '@kbn/react-kibana-mount';

import { OPTIONS_LIST_CONTROL, RANGE_SLIDER_CONTROL } from '../..';
import {
  DEFAULT_CONTROL_GROW,
  DEFAULT_CONTROL_WIDTH,
} from '../../../common/control_group/control_group_constants';
import { ControlInputTransform } from '../../../common/types';
import { pluginServices } from '../../services';
import { DataControlEditorChanges, IEditableControlFactory } from '../../types';
import { ControlGroupStrings } from '../control_group_strings';
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
import { ControlEditor } from './control_editor';

export function openAddDataControlFlyout(
  this: ControlGroupContainer,
  options?: {
    controlInputTransform?: ControlInputTransform;
    onSave?: (id: string) => void;
  }
) {
  const { controlInputTransform, onSave } = options || {};
  const {
    core: { theme, i18n },
    overlays: { openFlyout, openConfirm },
    controls: { getControlFactory },
  } = pluginServices.getServices();

  const onCancel = (changes?: DataControlEditorChanges) => {
    if (!changes || Object.keys(changes.input).length === 0) {
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

  const onSaveFlyout = async (changes: DataControlEditorChanges, type?: string) => {
    this.closeAllFlyouts();
    if (!type) {
      return;
    }

    let controlInput = changes.input;
    const factory = getControlFactory(type) as IEditableControlFactory;
    if (factory.presaveTransformFunction) {
      controlInput = factory.presaveTransformFunction(controlInput);
    }

    if (controlInputTransform) {
      controlInput = controlInputTransform({ ...controlInput }, type);
    }

    const dataControlInput = {
      grow: changes.grow,
      width: changes.width,
      ...controlInput,
    };
    let newControl;
    switch (type) {
      case OPTIONS_LIST_CONTROL:
        newControl = await this.addOptionsListControl(
          dataControlInput as AddOptionsListControlProps
        );
        break;
      case RANGE_SLIDER_CONTROL:
        newControl = await this.addRangeSliderControl(
          dataControlInput as AddRangeSliderControlProps
        );
        break;
      default:
        newControl = await this.addDataControlFromField(dataControlInput as AddDataControlProps);
    }

    if (onSave && !isErrorEmbeddable(newControl)) {
      onSave(newControl.id);
    }

    batch(() => {
      this.dispatch.setDefaultControlGrow(changes.grow);
      this.dispatch.setDefaultControlWidth(changes.width);
    });
  };

  const flyoutInstance = openFlyout(
    toMountPoint(
      <ControlGroupContainerContext.Provider value={this}>
        <ControlEditor
          dataViewId={this.getOutput().dataViewIds?.[0]}
          setLastUsedDataViewId={(newId) => this.setLastUsedDataViewId(newId)}
          getRelevantDataViewId={this.getMostRelevantDataViewId}
          isCreate={true}
          width={this.getInput().defaultControlWidth ?? DEFAULT_CONTROL_WIDTH}
          grow={this.getInput().defaultControlGrow ?? DEFAULT_CONTROL_GROW}
          onSave={onSaveFlyout}
          onCancel={onCancel}
        />
      </ControlGroupContainerContext.Provider>,
      { theme, i18n }
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
