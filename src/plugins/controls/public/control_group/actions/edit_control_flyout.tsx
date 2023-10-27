/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { isEqual } from 'lodash';
import React from 'react';

import { EmbeddableFactoryNotFoundError } from '@kbn/embeddable-plugin/public';

import {
  DataControlInput,
  ControlEmbeddable,
  IEditableControlFactory,
  DataControlEditorChanges,
} from '../../types';
import { pluginServices } from '../../services';
import { ControlGroupStrings } from '../control_group_strings';
import { useControlGroupContainer } from '../embeddable/control_group_container';
import { ControlEditor } from '../editor/control_editor';

export const EditControlFlyout = ({
  embeddable,
  closeFlyout,
  removeControl,
}: {
  embeddable: ControlEmbeddable<DataControlInput>;
  closeFlyout: () => void;
  removeControl: () => void;
}) => {
  // Controls Services Context
  const {
    overlays: { openConfirm },
    controls: { getControlFactory },
  } = pluginServices.getServices();
  // Redux embeddable container Context
  const controlGroup = useControlGroupContainer();

  // current state
  const panels = controlGroup.select((state) => state.explicitInput.panels);
  const panel = panels[embeddable.id];

  const onCancel = (changes: DataControlEditorChanges) => {
    if (
      isEqual(panel.explicitInput, {
        ...panel.explicitInput,
        ...changes.input,
      }) &&
      changes.grow === panel.grow &&
      changes.width === panel.width
    ) {
      closeFlyout();
      return;
    }
    openConfirm(ControlGroupStrings.management.discardChanges.getSubtitle(), {
      confirmButtonText: ControlGroupStrings.management.discardChanges.getConfirm(),
      cancelButtonText: ControlGroupStrings.management.discardChanges.getCancel(),
      title: ControlGroupStrings.management.discardChanges.getTitle(),
      buttonColor: 'danger',
    }).then((confirmed) => {
      if (confirmed) {
        closeFlyout();
      }
    });
  };

  const onSave = async (changes: DataControlEditorChanges, type?: string) => {
    if (!type) {
      closeFlyout();
      return;
    }
    const factory = getControlFactory(type) as IEditableControlFactory;
    if (!factory) throw new EmbeddableFactoryNotFoundError(type);
    let inputToReturn = changes.input;
    if (factory.presaveTransformFunction) {
      inputToReturn = factory.presaveTransformFunction(inputToReturn, embeddable);
    }

    if (changes.width && changes.width !== panel.width)
      controlGroup.dispatch.setControlWidth({
        width: changes.width,
        embeddableId: embeddable.id,
      });
    if (changes.grow !== undefined && changes.grow !== panel.grow) {
      controlGroup.dispatch.setControlGrow({
        grow: changes.grow,
        embeddableId: embeddable.id,
      });
    }

    closeFlyout();
    if (panel.type === type) {
      controlGroup.updateInputForChild(embeddable.id, inputToReturn);
    } else {
      await controlGroup.replaceEmbeddable(embeddable.id, inputToReturn, type);
    }
  };

  return (
    <ControlEditor
      isCreate={false}
      width={panel.width}
      grow={panel.grow}
      embeddable={embeddable}
      onCancel={onCancel}
      setLastUsedDataViewId={(lastUsed) => controlGroup.setLastUsedDataViewId(lastUsed)}
      onSave={onSave}
      removeControl={() => {
        closeFlyout();
        removeControl();
      }}
    />
  );
};
