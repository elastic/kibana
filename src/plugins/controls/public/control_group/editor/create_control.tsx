/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { EuiButton, EuiContextMenuItem } from '@elastic/eui';
import React from 'react';

import { OverlayRef } from '@kbn/core/public';
import { toMountPoint } from '@kbn/kibana-react-plugin/public';
import { pluginServices } from '../../services';
import { ControlEditor } from './control_editor';
import { ControlGroupStrings } from '../control_group_strings';
import { ControlWidth, ControlInput, IEditableControlFactory, DataControlInput } from '../../types';
import {
  DEFAULT_CONTROL_WIDTH,
  DEFAULT_CONTROL_GROW,
} from '../../../common/control_group/control_group_constants';
import { setFlyoutRef } from '../embeddable/control_group_container';

export type CreateControlButtonTypes = 'toolbar' | 'callout';
export interface CreateControlButtonProps {
  defaultControlWidth?: ControlWidth;
  defaultControlGrow?: boolean;
  updateDefaultWidth: (defaultControlWidth: ControlWidth) => void;
  updateDefaultGrow: (defaultControlGrow: boolean) => void;
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
  buttonType,
  defaultControlWidth,
  defaultControlGrow,
  addNewEmbeddable,
  closePopover,
  getRelevantDataViewId,
  setLastUsedDataViewId,
  updateDefaultWidth,
  updateDefaultGrow,
}: CreateControlButtonProps) => {
  // Controls Services Context
  const {
    overlays: { openFlyout, openConfirm },
    controls: { getControlTypes, getControlFactory },
    theme: { theme$ },
  } = pluginServices.getServices();

  const createNewControl = async () => {
    const ControlsServicesProvider = pluginServices.getContextProvider();

    const initialInputPromise = new Promise<CreateControlResult>((resolve, reject) => {
      let inputToReturn: Partial<DataControlInput> = {};

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

      const onSave = (ref: OverlayRef, type?: string) => {
        if (!type) {
          reject();
          ref.close();
          return;
        }

        const factory = getControlFactory(type) as IEditableControlFactory;
        if (factory.presaveTransformFunction) {
          inputToReturn = factory.presaveTransformFunction(inputToReturn);
        }
        resolve({ type, controlInput: inputToReturn });
        ref.close();
      };

      const flyoutInstance = openFlyout(
        toMountPoint(
          <ControlsServicesProvider>
            <ControlEditor
              setLastUsedDataViewId={setLastUsedDataViewId}
              getRelevantDataViewId={getRelevantDataViewId}
              isCreate={true}
              width={defaultControlWidth ?? DEFAULT_CONTROL_WIDTH}
              grow={defaultControlGrow ?? DEFAULT_CONTROL_GROW}
              updateTitle={(newTitle) => (inputToReturn.title = newTitle)}
              updateWidth={updateDefaultWidth}
              updateGrow={updateDefaultGrow}
              onSave={(type) => onSave(flyoutInstance, type)}
              onCancel={() => onCancel(flyoutInstance)}
              onTypeEditorChange={(partialInput) =>
                (inputToReturn = { ...inputToReturn, ...partialInput })
              }
            />
          </ControlsServicesProvider>,
          { theme$ }
        ),
        {
          'aria-label': ControlGroupStrings.manageControl.getFlyoutCreateTitle(),
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
