/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { EuiButton, EuiContextMenuItem } from '@elastic/eui';
import React from 'react';

import { pluginServices } from '../../services';
import { ControlEditor } from './control_editor';
import { OverlayRef } from '../../../../../core/public';
import { ControlGroupStrings } from '../control_group_strings';
import { ControlWidth, ControlInput, IEditableControlFactory } from '../../types';
import { toMountPoint } from '../../../../kibana_react/public';
import { DEFAULT_CONTROL_WIDTH } from '../../../common/control_group/control_group_constants';

export type CreateControlButtonTypes = 'toolbar' | 'callout';
export interface CreateControlButtonProps {
  defaultControlWidth?: ControlWidth;
  updateDefaultWidth: (defaultControlWidth: ControlWidth) => void;
  addNewEmbeddable: (type: string, input: Omit<ControlInput, 'id'>) => void;
  setLastUsedDataViewId?: (newDataViewId: string) => void;
  getRelevantDataViewId?: () => string | undefined;
  buttonType: CreateControlButtonTypes;
  closePopover?: () => void;
}

interface CreateControlResult {
  type: string;
  controlInput: Omit<ControlInput, 'id'>;
}

export const CreateControlButton = ({
  defaultControlWidth,
  updateDefaultWidth,
  addNewEmbeddable,
  buttonType,
  closePopover,
  setLastUsedDataViewId,
  getRelevantDataViewId,
}: CreateControlButtonProps) => {
  // Controls Services Context
  const { overlays, controls } = pluginServices.getServices();
  const { getControlTypes, getControlFactory } = controls;
  const { openFlyout, openConfirm } = overlays;

  const createNewControl = async () => {
    const PresentationUtilProvider = pluginServices.getContextProvider();

    const initialInputPromise = new Promise<CreateControlResult>((resolve, reject) => {
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

      const flyoutInstance = openFlyout(
        toMountPoint(
          <PresentationUtilProvider>
            <ControlEditor
              setLastUsedDataViewId={setLastUsedDataViewId}
              getRelevantDataViewId={getRelevantDataViewId}
              isCreate={true}
              width={defaultControlWidth ?? DEFAULT_CONTROL_WIDTH}
              updateTitle={(newTitle) => (inputToReturn.title = newTitle)}
              updateWidth={updateDefaultWidth}
              onSave={(type: string) => {
                const factory = getControlFactory(type) as IEditableControlFactory;
                if (factory.presaveTransformFunction) {
                  inputToReturn = factory.presaveTransformFunction(inputToReturn);
                }
                resolve({ type, controlInput: inputToReturn });
                flyoutInstance.close();
              }}
              onCancel={() => onCancel(flyoutInstance)}
              onTypeEditorChange={(partialInput) =>
                (inputToReturn = { ...inputToReturn, ...partialInput })
              }
            />
          </PresentationUtilProvider>
        ),
        {
          onClose: (flyout) => onCancel(flyout),
        }
      );
    });

    initialInputPromise.then(
      async (promise) => {
        await addNewEmbeddable(promise.type, promise.controlInput);
      },
      () => {} // swallow promise rejection because it can be part of normal flow
    );
  };

  if (getControlTypes().length === 0) return null;

  const commonButtonProps = {
    key: 'addControl',
    onClick: () => {
      createNewControl();
      if (closePopover) {
        closePopover();
      }
    },
    'data-test-subj': 'controls-create-button',
    'aria-label': ControlGroupStrings.management.getManageButtonTitle(),
  };

  return buttonType === 'callout' ? (
    <EuiButton {...commonButtonProps} color="primary" size="s">
      {ControlGroupStrings.emptyState.getAddControlButtonTitle()}
    </EuiButton>
  ) : (
    <EuiContextMenuItem {...commonButtonProps} icon="plusInCircle">
      {ControlGroupStrings.emptyState.getAddControlButtonTitle()}
    </EuiContextMenuItem>
  );
};
