/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';

import {
  useBatchedOptionalPublishingSubjects,
  useBatchedPublishingSubjects,
} from '@kbn/presentation-publishing';
import { pluginServices } from '../../services';
import { ControlWidth, DataControlEditorChanges, DefaultControlApi } from '../../types';
import { ControlGroupStrings } from '../control_group_strings';
import { ControlEditor } from '../editor/control_editor';
import { BehaviorSubject } from 'rxjs';

export const EditControlFlyout = ({
  api,
  closeFlyout,
  removeControl,
}: {
  api: DefaultControlApi;
  closeFlyout: () => void;
  removeControl: () => void;
}) => {
  console.log('hjere2');
  // Controls Services Context
  const {
    overlays: { openConfirm },
    controls: { getControlFactory },
  } = pluginServices.getServices();

  const controlGroup = api.parentApi;

  const [lastUsedDataViewId] = useBatchedOptionalPublishingSubjects(
    controlGroup.lastUsedDataViewId
  );

  const [
    controlWidth,
    controlGrow,
    controlSettings,
    panelTitle,
    dataView,
    controlField,
    defaultControlWidth,
    defaultControlGrow,
    controlGroupDataViews,
  ] = useBatchedPublishingSubjects(
    api.width$,
    api.grow$,
    api.settings,
    api.panelTitle,
    api.dataView,
    api.fieldName$,
    controlGroup.defaultWidth$,
    controlGroup.defaultGrow$,
    controlGroup.dataViews
  );

  /**
   * We are only applying these changes on save - so, duplicate everything into state manager which will store
   * the current editor state, and these changes will only be applied to the actual control state on save
   */
  const stateManager = {
    dataViewId$: new BehaviorSubject<string | undefined>(
      dataView?.id ?? lastUsedDataViewId ?? controlGroupDataViews?.[0].id
    ),
    fieldName$: new BehaviorSubject<string | undefined>(controlField),
    grow: new BehaviorSubject<boolean | undefined>(
      controlGrow === undefined ? defaultControlGrow : controlGrow
    ),
    width: new BehaviorSubject<ControlWidth | undefined>(controlWidth ?? defaultControlWidth),
    settings: new BehaviorSubject<object | undefined>(controlSettings),
  };

  // const [defaultPanelTitle] = useBatchedOptionalPublishingSubjects(embeddable.defaultPanelTitle);

  // const onCancel = (changes: DataControlEditorChanges) => {
  //   if (
  //     dataView?.id === changes.input.dataViewId &&
  //     controlField === changes.input.fieldName &&
  //     panelTitle === changes.input.title &&
  //     controlGrow === changes.grow &&
  //     controlWidth === changes.width
  //   ) {
  //     closeFlyout();
  //     return;
  //   }
  //   openConfirm(ControlGroupStrings.management.discardChanges.getSubtitle(), {
  //     confirmButtonText: ControlGroupStrings.management.discardChanges.getConfirm(),
  //     cancelButtonText: ControlGroupStrings.management.discardChanges.getCancel(),
  //     title: ControlGroupStrings.management.discardChanges.getTitle(),
  //     buttonColor: 'danger',
  //   }).then((confirmed) => {
  //     if (confirmed) {
  //       closeFlyout();
  //     }
  //   });
  // };

  // const onSave = async (changes: DataControlEditorChanges, type?: string) => {
  //   if (!type) {
  //     closeFlyout();
  //     return;
  //   }

  //   if (changes.width && changes.width !== controlWidth) {
  //     embeddable.setWidth(changes.width);
  //   }
  //   if (changes.grow !== undefined && changes.grow !== controlGrow) {
  //     embeddable.setGrow(changes.grow);
  //   }

  //   /**
  //    * TODO: Once the embeddable refactor is complete, we could make this more efficient by only replacing the panel
  //    * if the type changed - otherwise, we could simply change the individual state as needed
  //    */
  //   // const factory = getControlFactory(type) as IEditableControlFactory;
  //   // let inputToReturn = { ...embeddable.getExplicitInput(), ...changes.input };
  //   // if (factory && factory.presaveTransformFunction) {
  //   //   inputToReturn = factory.presaveTransformFunction(inputToReturn, embeddable);
  //   // }

  //   if (
  //     type !== embeddable.type ||
  //     changes.input.fieldName !== controlField ||
  //     changes.input.dataViewId !== dataView?.id
  //   ) {
  //     controlGroup.replacePanel(embeddable.uuid, { panelType: type, initialState: changes.input });
  //   } else {
  //     console.log('here');
  //   }

  //   closeFlyout();
  // };

  return (
    <ControlEditor
      api={api}
      parentApi={controlGroup}
      stateManager={stateManager}
      // isCreate={false}
      // width={controlWidth ?? defaultControlWidth}
      // grow={controlGrow === undefined ? defaultControlGrow : controlGrow}
      // embeddable={embeddable}
      // onCancel={onCancel}
      // setLastUsedDataViewId={(lastUsed) => controlGroup.setLastUsedDataViewId(lastUsed)}
      // onSave={onSave}
      // removeControl={() => {
      //   closeFlyout();
      //   removeControl();
      // }}
    />
  );
};
