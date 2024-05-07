/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';

import { useBatchedPublishingSubjects } from '@kbn/presentation-publishing';
import { pluginServices } from '../../services';
import { DataControlEditorChanges, IEditableControlFactory } from '../../types';
import { ControlGroupStrings } from '../control_group_strings';
import { ControlEditor } from '../editor/control_editor';
import { ControlGroupContainer } from '../embeddable/control_group_container';
import { ControlGroupApi } from '../types';
import { EditControlActionApi } from './edit_control_action';

export const EditControlFlyout = ({
  embeddable,
  closeFlyout,
  removeControl,
}: {
  embeddable: EditControlActionApi;
  closeFlyout: () => void;
  removeControl: () => void;
}) => {
  // Controls Services Context
  const {
    overlays: { openConfirm },
    controls: { getControlFactory },
  } = pluginServices.getServices();

  const controlGroup = embeddable.parentApi as unknown as ControlGroupContainer & ControlGroupApi;

  const [
    controlWidth,
    controlGrow,
    panelTitle,
    dataView,
    controlField,
    defaultControlWidth,
    defaultControlGrow,
  ] = useBatchedPublishingSubjects(
    embeddable.width$,
    embeddable.grow$,
    embeddable.panelTitle,
    embeddable.dataView,
    embeddable.fieldName$,
    controlGroup.defaultWidth$,
    controlGroup.defaultGrow$
  );
  // const [defaultPanelTitle] = useBatchedOptionalPublishingSubjects(embeddable.defaultPanelTitle);

  const onCancel = (changes: DataControlEditorChanges) => {
    if (
      dataView?.id === changes.input.dataViewId &&
      controlField === changes.input.fieldName &&
      panelTitle === changes.input.title &&
      controlGrow === changes.grow &&
      controlWidth === changes.width
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

    if (changes.width && changes.width !== controlWidth) {
      embeddable.setWidth(changes.width);
      if (controlWidth) controlGroup.setDefaultControlWidth(changes.width);
    }
    if (changes.grow !== undefined && changes.grow !== controlGrow) {
      embeddable.setGrow(changes.grow);
      if (controlGrow !== undefined) controlGroup.setDefaultControlGrow(changes.grow);
    }

    /**
     * TODO: Once the embeddable refactor is complete, we could make this more efficient by only replacing the panel
     * if the type changed - otherwise, we could simply change the individual state as needed
     */
    // const factory = getControlFactory(type) as IEditableControlFactory;
    // let inputToReturn = { ...embeddable.getExplicitInput(), ...changes.input };
    // if (factory && factory.presaveTransformFunction) {
    //   inputToReturn = factory.presaveTransformFunction(inputToReturn, embeddable);
    // }
    controlGroup.replacePanel(embeddable.uuid, { panelType: type, initialState: changes.input });

    closeFlyout();
  };

  return (
    <ControlEditor
      isCreate={false}
      width={controlWidth ?? defaultControlWidth}
      grow={controlGrow === undefined ? defaultControlGrow : controlGrow}
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
