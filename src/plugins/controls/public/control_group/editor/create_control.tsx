/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {
  EuiButton,
  EuiButtonIconColor,
  EuiContextMenuItem,
  EuiContextMenuPanel,
  EuiPopover,
} from '@elastic/eui';
import React, { useState, ReactElement } from 'react';

import { pluginServices } from '../../services';
import { ControlEditor } from './control_editor';
import { OverlayRef } from '../../../../../core/public';
import { ControlGroupStrings } from '../control_group_strings';
import { EmbeddableFactoryNotFoundError } from '../../../../embeddable/public';
import { ControlWidth, IEditableControlFactory, ControlInput } from '../../types';
import { toMountPoint } from '../../../../kibana_react/public';
import { DEFAULT_CONTROL_WIDTH } from '../../../common/control_group/control_group_constants';

export type CreateControlButtonTypes = 'toolbar' | 'callout';
export interface CreateControlButtonProps {
  defaultControlWidth?: ControlWidth;
  updateDefaultWidth: (defaultControlWidth: ControlWidth) => void;
  addNewEmbeddable: (type: string, input: Omit<ControlInput, 'id'>) => void;
  buttonType: CreateControlButtonTypes;
  closePopover?: () => void;
}

export const CreateControlButton = ({
  defaultControlWidth,
  updateDefaultWidth,
  addNewEmbeddable,
  buttonType,
  closePopover,
}: CreateControlButtonProps) => {
  // Controls Services Context
  const { overlays, controls } = pluginServices.getServices();
  const { getControlTypes, getControlFactory } = controls;
  const { openFlyout, openConfirm } = overlays;
  const [isControlTypePopoverOpen, setIsControlTypePopoverOpen] = useState(false);

  const createNewControl = async (type: string) => {
    const PresentationUtilProvider = pluginServices.getContextProvider();
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
        toMountPoint(
          <PresentationUtilProvider>
            <ControlEditor
              isCreate={true}
              factory={editableFactory}
              width={defaultControlWidth ?? DEFAULT_CONTROL_WIDTH}
              updateTitle={(newTitle) => (inputToReturn.title = newTitle)}
              updateWidth={updateDefaultWidth}
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
            />
          </PresentationUtilProvider>
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
    color: 'primary' as EuiButtonIconColor,
    'data-test-subj': 'controls-create-button',
    'aria-label': ControlGroupStrings.management.getManageButtonTitle(),
  };

  const items: ReactElement[] = [];
  getControlTypes().forEach((type) => {
    const factory = getControlFactory(type);
    items.push(
      <EuiContextMenuItem
        key={type}
        icon={factory.getIconType?.()}
        data-test-subj={`create-${type}-control`}
        onClick={() => {
          if (buttonType === 'callout' && isControlTypePopoverOpen) {
            setIsControlTypePopoverOpen(false);
          } else if (closePopover) {
            closePopover();
          }
          createNewControl(type);
        }}
        toolTipContent={factory.getDescription()}
      >
        {factory.getDisplayName()}
      </EuiContextMenuItem>
    );
  });

  if (buttonType === 'callout') {
    const onCreateButtonClick = () => {
      if (getControlTypes().length > 1) {
        setIsControlTypePopoverOpen(!isControlTypePopoverOpen);
        return;
      }
      createNewControl(getControlTypes()[0]);
    };

    const createControlButton = (
      <EuiButton {...commonButtonProps} onClick={onCreateButtonClick} size="s">
        {ControlGroupStrings.emptyState.getAddControlButtonTitle()}
      </EuiButton>
    );
    return (
      <EuiPopover
        button={createControlButton}
        isOpen={isControlTypePopoverOpen}
        panelPaddingSize="none"
        anchorPosition="downLeft"
        data-test-subj="control-type-picker"
        closePopover={() => setIsControlTypePopoverOpen(false)}
      >
        <EuiContextMenuPanel items={items} />
      </EuiPopover>
    );
  }
  return <EuiContextMenuPanel items={items} />;
};
