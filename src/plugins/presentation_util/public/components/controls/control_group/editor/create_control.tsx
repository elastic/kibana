/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {
  EuiButton,
  EuiButtonIcon,
  EuiButtonIconColor,
  EuiContextMenuItem,
  EuiContextMenuPanel,
  EuiPopover,
} from '@elastic/eui';
import React, { useState, ReactElement } from 'react';

import { ControlGroupInput } from '../types';
import { ControlEditor } from './control_editor';
import { pluginServices } from '../../../../services';
import { forwardAllContext } from './forward_all_context';
import { DEFAULT_CONTROL_WIDTH } from './editor_constants';
import { OverlayRef } from '../../../../../../../core/public';
import { ControlGroupStrings } from '../control_group_strings';
import { controlGroupReducers } from '../state/control_group_reducers';
import { ControlWidth, IEditableControlFactory, ControlInput } from '../../types';
import { EmbeddableFactoryNotFoundError } from '../../../../../../embeddable/public';
import { useReduxContainerContext } from '../../../redux_embeddables/redux_embeddable_context';

export const CreateControlButton = ({ isIconButton }: { isIconButton: boolean }) => {
  // Presentation Services Context
  const { overlays, controls } = pluginServices.getHooks();
  const { getControlTypes, getControlFactory } = controls.useService();
  const { openFlyout, openConfirm } = overlays.useService();

  // Redux embeddable container Context
  const reduxContainerContext = useReduxContainerContext<
    ControlGroupInput,
    typeof controlGroupReducers
  >();
  const {
    containerActions: { addNewEmbeddable },
    actions: { setDefaultControlWidth },
    useEmbeddableSelector,
    useEmbeddableDispatch,
  } = reduxContainerContext;
  const dispatch = useEmbeddableDispatch();

  // current state
  const { defaultControlWidth } = useEmbeddableSelector((state) => state);
  const [isControlTypePopoverOpen, setIsControlTypePopoverOpen] = useState(false);

  const createNewControl = async (type: string) => {
    const factory = getControlFactory(type);
    if (!factory) throw new EmbeddableFactoryNotFoundError(type);

    const initialInputPromise = new Promise<Omit<ControlInput, 'id'>>((resolve, reject) => {
      let inputToReturn: Partial<ControlInput> = {};

      const onCancel = (ref: OverlayRef) => {
        if (Object.keys(inputToReturn).length === 0) {
          reject();
          ref.close();
          return;
        }
        openConfirm(ControlGroupStrings.management.discardNewControl.getSubtitle(), {
          confirmButtonText: ControlGroupStrings.management.discardNewControl.getConfirm(),
          cancelButtonText: ControlGroupStrings.management.discardNewControl.getCancel(),
          title: ControlGroupStrings.management.discardNewControl.getTitle(),
          buttonColor: 'danger',
        }).then((confirmed) => {
          if (confirmed) {
            reject();
            ref.close();
          }
        });
      };

      const editableFactory = factory as IEditableControlFactory;

      const flyoutInstance = openFlyout(
        forwardAllContext(
          <ControlEditor
            isCreate={true}
            factory={editableFactory}
            width={defaultControlWidth ?? DEFAULT_CONTROL_WIDTH}
            updateTitle={(newTitle) => (inputToReturn.title = newTitle)}
            updateWidth={(newWidth) => dispatch(setDefaultControlWidth(newWidth as ControlWidth))}
            onTypeEditorChange={(partialInput) =>
              (inputToReturn = { ...inputToReturn, ...partialInput })
            }
            onSave={() => {
              if (editableFactory.presaveTransformFunction) {
                inputToReturn = editableFactory.presaveTransformFunction(inputToReturn);
              }
              resolve(inputToReturn);
              flyoutInstance.close();
            }}
            onCancel={() => onCancel(flyoutInstance)}
          />,
          reduxContainerContext
        ),
        {
          onClose: (flyout) => onCancel(flyout),
        }
      );
    });

    initialInputPromise.then(
      async (explicitInput) => {
        await addNewEmbeddable(type, explicitInput);
      },
      () => {} // swallow promise rejection because it can be part of normal flow
    );
  };

  if (getControlTypes().length === 0) return null;

  const commonButtonProps = {
    iconType: 'plusInCircle',
    color: 'primary' as EuiButtonIconColor,
    'data-test-subj': 'controlsCreateButton',
    'aria-label': ControlGroupStrings.management.getManageButtonTitle(),
  };

  const onCreateButtonClick = () => {
    if (getControlTypes().length > 1) {
      setIsControlTypePopoverOpen(!isControlTypePopoverOpen);
      return;
    }
    createNewControl(getControlTypes()[0]);
  };

  const createControlButton = isIconButton ? (
    <EuiButtonIcon {...commonButtonProps} onClick={onCreateButtonClick} />
  ) : (
    <EuiButton
      data-test-subj={'controlsCreateButton'}
      onClick={onCreateButtonClick}
      color="primary"
      size="s"
    >
      {ControlGroupStrings.emptyState.getAddControlButtonTitle()}
    </EuiButton>
  );

  if (getControlTypes().length > 1) {
    const items: ReactElement[] = [];
    getControlTypes().forEach((type) => {
      const factory = getControlFactory(type);
      items.push(
        <EuiContextMenuItem
          key={type}
          icon={factory.getIconType?.()}
          onClick={() => {
            setIsControlTypePopoverOpen(false);
            createNewControl(type);
          }}
        >
          {factory.getDisplayName()}
        </EuiContextMenuItem>
      );
    });

    return (
      <EuiPopover
        button={createControlButton}
        isOpen={isControlTypePopoverOpen}
        panelPaddingSize="none"
        anchorPosition="downLeft"
        closePopover={() => setIsControlTypePopoverOpen(false)}
      >
        <EuiContextMenuPanel size="s" items={items} />
      </EuiPopover>
    );
  }
  return createControlButton;
};
