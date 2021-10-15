/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {
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
import { OverlayRef } from '../../../../../../../core/public';
import { ControlGroupStrings } from '../control_group_strings';
import { InputControlInput } from '../../../../services/controls';
import { DEFAULT_CONTROL_WIDTH } from '../control_group_constants';
import { ControlWidth, IEditableControlFactory } from '../../types';
import { controlGroupReducers } from '../state/control_group_reducers';
import { EmbeddableFactoryNotFoundError } from '../../../../../../embeddable/public';
import { useReduxContainerContext } from '../../../redux_embeddables/redux_embeddable_context';

export const CreateControlButton = () => {
  // Presentation Services Context
  const { overlays, controls } = pluginServices.getHooks();
  const { getInputControlTypes, getControlFactory } = controls.useService();
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
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  const createNewControl = async (type: string) => {
    const factory = getControlFactory(type);
    if (!factory) throw new EmbeddableFactoryNotFoundError(type);

    const initialInputPromise = new Promise<Omit<InputControlInput, 'id'>>((resolve, reject) => {
      let inputToReturn: Partial<InputControlInput> = {};

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

      const flyoutInstance = openFlyout(
        forwardAllContext(
          <ControlEditor
            width={defaultControlWidth ?? DEFAULT_CONTROL_WIDTH}
            updateTitle={(newTitle) => (inputToReturn.title = newTitle)}
            updateWidth={(newWidth) => dispatch(setDefaultControlWidth(newWidth as ControlWidth))}
            controlEditorComponent={(factory as IEditableControlFactory).getControlEditor?.({
              onChange: (partialInput) => {
                inputToReturn = { ...inputToReturn, ...partialInput };
              },
            })}
            onSave={() => {
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

  if (getInputControlTypes().length === 0) return null;

  const commonButtonProps = {
    iconType: 'plusInCircle',
    color: 'primary' as EuiButtonIconColor,
    'data-test-subj': 'inputControlsSortingButton',
    'aria-label': ControlGroupStrings.management.getManageButtonTitle(),
  };

  if (getInputControlTypes().length > 1) {
    const items: ReactElement[] = [];
    getInputControlTypes().forEach((type) => {
      const factory = getControlFactory(type);
      items.push(
        <EuiContextMenuItem
          key={type}
          icon={factory.getIconType?.()}
          onClick={() => {
            setIsPopoverOpen(false);
            createNewControl(type);
          }}
        >
          {factory.getDisplayName()}
        </EuiContextMenuItem>
      );
    });
    const button = <EuiButtonIcon {...commonButtonProps} onClick={() => setIsPopoverOpen(true)} />;

    return (
      <EuiPopover
        button={button}
        isOpen={isPopoverOpen}
        panelPaddingSize="none"
        anchorPosition="downLeft"
        closePopover={() => setIsPopoverOpen(false)}
      >
        <EuiContextMenuPanel size="s" items={items} />
      </EuiPopover>
    );
  }
  return (
    <EuiButtonIcon
      {...commonButtonProps}
      onClick={() => createNewControl(getInputControlTypes()[0])}
    />
  );
};
