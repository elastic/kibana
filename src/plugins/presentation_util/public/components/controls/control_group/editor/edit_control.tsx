/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { isEqual } from 'lodash';
import { EuiButtonIcon } from '@elastic/eui';
import React, { useEffect, useRef } from 'react';

import { ControlGroupInput } from '../types';
import { ControlEditor } from './control_editor';
import { pluginServices } from '../../../../services';
import { forwardAllContext } from './forward_all_context';
import { OverlayRef } from '../../../../../../../core/public';
import { ControlGroupStrings } from '../control_group_strings';
import { IEditableControlFactory, ControlInput } from '../../types';
import { controlGroupReducers } from '../state/control_group_reducers';
import { EmbeddableFactoryNotFoundError } from '../../../../../../embeddable/public';
import { useReduxContainerContext } from '../../../redux_embeddables/redux_embeddable_context';

export const EditControlButton = ({ embeddableId }: { embeddableId: string }) => {
  // Presentation Services Context
  const { overlays, controls } = pluginServices.getHooks();
  const { getControlFactory } = controls.useService();
  const { openFlyout, openConfirm } = overlays.useService();

  // Redux embeddable container Context
  const reduxContainerContext = useReduxContainerContext<
    ControlGroupInput,
    typeof controlGroupReducers
  >();
  const {
    containerActions: { untilEmbeddableLoaded, removeEmbeddable, updateInputForChild },
    actions: { setControlWidth },
    useEmbeddableSelector,
    useEmbeddableDispatch,
  } = reduxContainerContext;
  const dispatch = useEmbeddableDispatch();

  // current state
  const { panels } = useEmbeddableSelector((state) => state);

  // keep up to date ref of latest panel state for comparison when closing editor.
  const latestPanelState = useRef(panels[embeddableId]);
  useEffect(() => {
    latestPanelState.current = panels[embeddableId];
  }, [panels, embeddableId]);

  const editControl = async () => {
    const panel = panels[embeddableId];
    const factory = getControlFactory(panel.type);
    const embeddable = await untilEmbeddableLoaded(embeddableId);

    let inputToReturn: Partial<ControlInput> = {};

    if (!factory) throw new EmbeddableFactoryNotFoundError(panel.type);

    let removed = false;
    const onCancel = (ref: OverlayRef) => {
      if (
        removed ||
        (isEqual(latestPanelState.current.explicitInput, {
          ...panel.explicitInput,
          ...inputToReturn,
        }) &&
          isEqual(latestPanelState.current.width, panel.width))
      ) {
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
          dispatch(setControlWidth({ width: panel.width, embeddableId }));
          ref.close();
        }
      });
    };

    const editableFactory = factory as IEditableControlFactory;

    const flyoutInstance = openFlyout(
      forwardAllContext(
        <ControlEditor
          isCreate={false}
          width={panel.width}
          embeddable={embeddable}
          factory={editableFactory}
          title={embeddable.getTitle()}
          onCancel={() => onCancel(flyoutInstance)}
          updateTitle={(newTitle) => (inputToReturn.title = newTitle)}
          updateWidth={(newWidth) => dispatch(setControlWidth({ width: newWidth, embeddableId }))}
          onTypeEditorChange={(partialInput) =>
            (inputToReturn = { ...inputToReturn, ...partialInput })
          }
          onSave={() => {
            if (editableFactory.presaveTransformFunction) {
              inputToReturn = editableFactory.presaveTransformFunction(inputToReturn, embeddable);
            }
            updateInputForChild(embeddableId, inputToReturn);
            flyoutInstance.close();
          }}
          removeControl={() => {
            openConfirm(ControlGroupStrings.management.deleteControls.getSubtitle(), {
              confirmButtonText: ControlGroupStrings.management.deleteControls.getConfirm(),
              cancelButtonText: ControlGroupStrings.management.deleteControls.getCancel(),
              title: ControlGroupStrings.management.deleteControls.getDeleteTitle(),
              buttonColor: 'danger',
            }).then((confirmed) => {
              if (confirmed) {
                removeEmbeddable(embeddableId);
                removed = true;
                flyoutInstance.close();
              }
            });
          }}
        />,
        reduxContainerContext
      ),
      {
        onClose: (flyout) => onCancel(flyout),
      }
    );
  };

  return (
    <EuiButtonIcon
      aria-label={ControlGroupStrings.floatingActions.getEditButtonTitle()}
      iconType="pencil"
      onClick={() => editControl()}
      color="text"
    />
  );
};
