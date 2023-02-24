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

import { OverlayRef } from '@kbn/core/public';
import { toMountPoint } from '@kbn/kibana-react-plugin/public';
import { EmbeddableFactoryNotFoundError } from '@kbn/embeddable-plugin/public';

import {
  ControlInput,
  DataControlInput,
  ControlEmbeddable,
  IEditableControlFactory,
} from '../../types';
import { pluginServices } from '../../services';
import { ControlEditor } from './control_editor';
import { ControlGroupStrings } from '../control_group_strings';
import { setFlyoutRef } from '../embeddable/control_group_container';
import { useControlGroupContainerContext } from '../control_group_renderer';

interface EditControlResult {
  type: string;
  controlInput: Omit<ControlInput, 'id'>;
}

export const EditControlButton = ({ embeddableId }: { embeddableId: string }) => {
  // Controls Services Context
  const {
    overlays: { openFlyout, openConfirm },
    controls: { getControlFactory },
    theme: { theme$ },
  } = pluginServices.getServices();
  // Redux embeddable container Context
  const reduxContext = useControlGroupContainerContext();
  const {
    embeddableInstance: controlGroup,
    actions: { setControlWidth, setControlGrow },
    useEmbeddableSelector,
    useEmbeddableDispatch,
  } = reduxContext;
  const dispatch = useEmbeddableDispatch();

  // current state
  const panels = useEmbeddableSelector((state) => state.explicitInput.panels);

  // keep up to date ref of latest panel state for comparison when closing editor.
  const latestPanelState = useRef(panels[embeddableId]);
  useEffect(() => {
    latestPanelState.current = panels[embeddableId];
  }, [panels, embeddableId]);

  const editControl = async () => {
    const ControlsServicesProvider = pluginServices.getContextProvider();
    const embeddable = (await controlGroup.untilEmbeddableLoaded(
      embeddableId
    )) as ControlEmbeddable<DataControlInput>;

    const initialInputPromise = new Promise<EditControlResult>((resolve, reject) => {
      const panel = panels[embeddableId];
      let factory = getControlFactory(panel.type);
      if (!factory) throw new EmbeddableFactoryNotFoundError(panel.type);

      let inputToReturn: Partial<DataControlInput> = {};

      let removed = false;
      const onCancel = (ref: OverlayRef) => {
        if (
          removed ||
          (isEqual(latestPanelState.current.explicitInput, {
            ...panel.explicitInput,
            ...inputToReturn,
          }) &&
            isEqual(latestPanelState.current.width, panel.width) &&
            isEqual(latestPanelState.current.grow, panel.grow))
        ) {
          reject();
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
            dispatch(setControlGrow({ grow: panel.grow, embeddableId }));
            reject();
            ref.close();
          }
        });
      };

      const onSave = (ref: OverlayRef, type?: string) => {
        if (!type) {
          reject();
          ref.close();
          return;
        }

        // if the control now has a new type, need to replace the old factory with
        // one of the correct new type
        if (latestPanelState.current.type !== type) {
          factory = getControlFactory(type);
          if (!factory) throw new EmbeddableFactoryNotFoundError(type);
        }
        const editableFactory = factory as IEditableControlFactory;
        if (editableFactory.presaveTransformFunction) {
          inputToReturn = editableFactory.presaveTransformFunction(inputToReturn, embeddable);
        }
        resolve({ type, controlInput: inputToReturn });
        ref.close();
      };

      const ReduxWrapper = controlGroup.getReduxEmbeddableTools().Wrapper;

      const flyoutInstance = openFlyout(
        toMountPoint(
          <ControlsServicesProvider>
            <ReduxWrapper>
              <ControlEditor
                isCreate={false}
                width={panel.width}
                grow={panel.grow}
                embeddable={embeddable}
                title={embeddable.getTitle()}
                onCancel={() => onCancel(flyoutInstance)}
                updateTitle={(newTitle) => (inputToReturn.title = newTitle)}
                setLastUsedDataViewId={(lastUsed) => controlGroup.setLastUsedDataViewId(lastUsed)}
                updateWidth={(newWidth) =>
                  dispatch(setControlWidth({ width: newWidth, embeddableId }))
                }
                updateGrow={(grow) => dispatch(setControlGrow({ grow, embeddableId }))}
                onTypeEditorChange={(partialInput) => {
                  inputToReturn = { ...inputToReturn, ...partialInput };
                }}
                onSave={(type) => onSave(flyoutInstance, type)}
                removeControl={() => {
                  openConfirm(ControlGroupStrings.management.deleteControls.getSubtitle(), {
                    confirmButtonText: ControlGroupStrings.management.deleteControls.getConfirm(),
                    cancelButtonText: ControlGroupStrings.management.deleteControls.getCancel(),
                    title: ControlGroupStrings.management.deleteControls.getDeleteTitle(),
                    buttonColor: 'danger',
                  }).then((confirmed) => {
                    if (confirmed) {
                      controlGroup.removeEmbeddable(embeddableId);
                      removed = true;
                      flyoutInstance.close();
                    }
                  });
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
            setFlyoutRef(undefined);
          },
        }
      );
      setFlyoutRef(flyoutInstance);
    });

    initialInputPromise.then(
      async (promise) => {
        await controlGroup.replaceEmbeddable(embeddable.id, promise.controlInput, promise.type);
      },
      () => {} // swallow promise rejection because it can be part of normal flow
    );
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
