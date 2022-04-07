/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { isEqual } from 'lodash';
import { EuiButtonIcon } from '@elastic/eui';
import React, { useCallback, useEffect, useMemo, useRef } from 'react';

import { OverlayRef } from '@kbn/core/public';
import { EmbeddableFactoryNotFoundError } from '@kbn/embeddable-plugin/public';
import { useReduxContainerContext } from '@kbn/presentation-util-plugin/public';
import { ControlGroupInput } from '../types';
import { ControlEditor } from './control_editor';
import { pluginServices } from '../../services';
import { forwardAllContext } from './forward_all_context';
import { ControlGroupStrings } from '../control_group_strings';
import {
  IEditableControlFactory,
  ControlInput,
  ControlEmbeddable,
  ControlOutput,
} from '../../types';
import { controlGroupReducers } from '../state/control_group_reducers';
import { ControlGroupContainer, setFlyoutRef } from '../embeddable/control_group_container';

export const EditControlButton = ({ embeddableId }: { embeddableId: string }) => {
  // Controls Services Context
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

  let inputToReturn: Partial<ControlInput> = {};
  let embeddable: ControlEmbeddable<ControlInput, ControlOutput> | undefined;
  const shouldResetSelections = useMemo(() => {
    return (
      inputToReturn.fieldName !== embeddable?.getInput().fieldName ||
      inputToReturn.dataViewId !== embeddable?.getInput().dataViewId
    );
  }, [embeddable, inputToReturn.fieldName, inputToReturn.dataViewId]);

  const editControl = async () => {
    const panel = panels[embeddableId];
    const factory = getControlFactory(panel.type);
    inputToReturn = {};
    embeddable = (await untilEmbeddableLoaded(embeddableId)) as ControlEmbeddable<
      ControlInput,
      ControlOutput
    >;
    const controlGroup = embeddable.getRoot() as ControlGroupContainer;

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

    const flyoutInstance = openFlyout(
      forwardAllContext(
        <ControlEditor
          isCreate={false}
          width={panel.width}
          embeddable={embeddable}
          title={embeddable.getTitle()}
          onCancel={() => onCancel(flyoutInstance)}
          updateTitle={(newTitle) => (inputToReturn.title = newTitle)}
          setLastUsedDataViewId={(lastUsed) => controlGroup.setLastUsedDataViewId(lastUsed)}
          updateWidth={(newWidth) => dispatch(setControlWidth({ width: newWidth, embeddableId }))}
          onTypeEditorChange={(partialInput) =>
            (inputToReturn = { ...inputToReturn, ...partialInput })
          }
          onSave={() => {
            const editableFactory = factory as IEditableControlFactory;
            if (editableFactory.presaveTransformFunction) {
              inputToReturn = editableFactory.presaveTransformFunction(inputToReturn, embeddable);
            }
            if (shouldResetSelections) {
              embeddable?.resetSelections();
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
        outsideClickCloses: false,
        onClose: (flyout) => {
          setFlyoutRef(undefined);
          onCancel(flyout);
        },
      }
    );
    setFlyoutRef(flyoutInstance);
  };

  return (
    <EuiButtonIcon
      data-test-subj={`control-action-${embeddableId}-edit`}
      aria-label={ControlGroupStrings.floatingActions.getEditButtonTitle()}
      iconType="pencil"
      onClick={() => editControl()}
      color="text"
    />
  );
};
