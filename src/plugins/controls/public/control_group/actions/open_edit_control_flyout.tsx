/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { isEqual } from 'lodash';

import { OverlayRef } from '@kbn/core-mount-utils-browser';
import { toMountPoint } from '@kbn/kibana-react-plugin/public';

import { ControlEditor } from '../editor/control_editor';
import { ControlPanelState } from '../types';
import { ControlEmbeddable, DataControlInput, IEditableControlFactory } from '../../types';
import { ControlGroupContainer } from '..';
import { setFlyoutRef } from '../embeddable/control_group_container';
import { ControlGroupStrings } from '../control_group_strings';
import { pluginServices } from '../../services';
import { EmbeddableFactoryNotFoundError } from '@kbn/embeddable-plugin/public';

export async function openEditControlFlyout(options: {
  embeddable: ControlEmbeddable<DataControlInput>;
  panelToEdit: ControlPanelState<DataControlInput>;
  removeControl: () => void;
}) {
  console.log('render flyout');
  const { embeddable, panelToEdit, removeControl } = options;
  const controlGroup = embeddable.parent as ControlGroupContainer;

  const {
    controls: { getControlFactory },
    overlays: { openConfirm, openFlyout },
    theme: { theme$ },
  } = pluginServices.getServices();
  const ControlsServicesProvider = pluginServices.getContextProvider();
  const ReduxWrapper = controlGroup.getReduxEmbeddableTools().Wrapper;

  let inputToReturn: Partial<DataControlInput> = {};
  let grow = panelToEdit.grow;
  let width = panelToEdit.width;

  const onCancel = (ref: OverlayRef) => {
    if (
      isEqual(panelToEdit.explicitInput, {
        ...panelToEdit.explicitInput,
        ...inputToReturn,
      })
    ) {
      setFlyoutRef(undefined);
      ref.close();
      return;
    }
    openConfirm(ControlGroupStrings.management.discardChanges.getSubtitle(), {
      confirmButtonText: ControlGroupStrings.management.discardChanges.getConfirm(),
      cancelButtonText: ControlGroupStrings.management.discardChanges.getCancel(),
      title: ControlGroupStrings.management.discardChanges.getTitle(),
      buttonColor: 'danger',
    }).then((confirmed) => {
      if (confirmed) {
        setFlyoutRef(undefined);
        ref.close();
      }
    });
  };

  const onSave = async (ref: OverlayRef, type?: string) => {
    if (!type) {
      ref.close();
      return;
    }

    // if the control now has a new type, need to replace the old factory with
    // one of the correct new type
    if (panelToEdit.type !== type) {
      const factory = getControlFactory(type);
      if (!factory) throw new EmbeddableFactoryNotFoundError(type);

      const editableFactory = factory as IEditableControlFactory;
      if (editableFactory.presaveTransformFunction) {
        inputToReturn = editableFactory.presaveTransformFunction(inputToReturn, embeddable);
      }
    }
    console.log('after', controlGroup.getExplicitInput().panels);
    controlGroup.updatePanelState(embeddable.id, { grow, width });
    await controlGroup.replaceEmbeddable(embeddable.id, inputToReturn, type);
    ref.close();
  };

  const flyoutInstance = openFlyout(
    toMountPoint(
      <ControlsServicesProvider>
        <ReduxWrapper>
          <ControlEditor
            isCreate={false}
            width={panelToEdit.width}
            grow={panelToEdit.grow}
            embeddable={embeddable}
            title={embeddable.getTitle()}
            onCancel={() => onCancel(flyoutInstance)}
            updateTitle={(newTitle) => (inputToReturn.title = newTitle)}
            setLastUsedDataViewId={(lastUsed) => controlGroup.setLastUsedDataViewId(lastUsed)}
            updateWidth={(newWidth) => {
              width = newWidth;
            }}
            updateGrow={(newGrow) => {
              grow = newGrow;
            }}
            onTypeEditorChange={(partialInput) => {
              inputToReturn = { ...inputToReturn, ...partialInput };
            }}
            onSave={(type) => onSave(flyoutInstance, type)}
            removeControl={() => {
              flyoutInstance.close();
              setFlyoutRef(undefined);
              removeControl(); // probably just create a DeleteControlAction as part of the editor??? Refer to `filters_notification_action`
            }}
          />
        </ReduxWrapper>
      </ControlsServicesProvider>,
      { theme$ }
    ),
    {
      'aria-label': ControlGroupStrings.manageControl.getFlyoutEditTitle(),
      outsideClickCloses: false,
      onClose: (flyout) => {
        onCancel(flyout);
      },
      ownFocus: true,
    }
  );

  setFlyoutRef(flyoutInstance);
}
