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

import {
  DEFAULT_CONTROL_WIDTH,
  DEFAULT_CONTROL_GROW,
} from '../../../common/control_group/control_group_constants';
import { pluginServices } from '../../services';
import { ControlWidth, ControlInput, IEditableControlFactory, DataControlInput } from '../../types';
import { ControlGroupStrings } from '../control_group_strings';
import { setFlyoutRef } from '../embeddable/control_group_container';
import { ControlEditor } from './control_editor';

export type CreateControlButtonTypes = 'toolbar' | 'callout';
export interface CreateControlButtonProps {
  buttonType: CreateControlButtonTypes;
  defaultControlGrow?: boolean;
  defaultControlWidth?: ControlWidth;
  addNewEmbeddable: (type: string, input: Omit<ControlInput, 'id'>) => void;
  closePopover?: () => void;
  getRelevantDataViewId?: () => string | undefined;
  setLastUsedDataViewId?: (newDataViewId: string) => void;
  updateDefaultGrow: (defaultControlGrow: boolean) => void;
  updateDefaultWidth: (defaultControlWidth: ControlWidth) => void;
}

interface CreateControlResult {
  controlInput: Omit<ControlInput, 'id'>;
  type: string;
}

export const CreateControlButton = ({
  buttonType,
  defaultControlGrow,
  defaultControlWidth,
  addNewEmbeddable,
  closePopover,
  getRelevantDataViewId,
  setLastUsedDataViewId,
  updateDefaultGrow,
  updateDefaultWidth,
}: CreateControlButtonProps) => {
  // Controls Services Context
  const { controls, overlays, theme } = pluginServices.getHooks();
  const { getControlFactory, getControlTypes } = controls.useService();
  const { openConfirm, openFlyout } = overlays.useService();
  const themeService = theme.useService();

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
          buttonColor: 'danger',
          cancelButtonText: ControlGroupStrings.management.discardNewControl.getCancel(),
          confirmButtonText: ControlGroupStrings.management.discardNewControl.getConfirm(),
          title: ControlGroupStrings.management.discardNewControl.getTitle(),
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
        resolve({ controlInput: inputToReturn, type });
        ref.close();
      };

      const flyoutInstance = openFlyout(
        toMountPoint(
          <ControlsServicesProvider>
            <ControlEditor
              getRelevantDataViewId={getRelevantDataViewId}
              grow={defaultControlGrow ?? DEFAULT_CONTROL_GROW}
              isCreate={true}
              onSave={(type) => onSave(flyoutInstance, type)}
              onCancel={() => onCancel(flyoutInstance)}
              onTypeEditorChange={(partialInput) =>
                (inputToReturn = { ...inputToReturn, ...partialInput })
              }
              setLastUsedDataViewId={setLastUsedDataViewId}
              updateTitle={(newTitle) => (inputToReturn.title = newTitle)}
              updateWidth={updateDefaultWidth}
              updateGrow={updateDefaultGrow}
              width={defaultControlWidth ?? DEFAULT_CONTROL_WIDTH}
            />
          </ControlsServicesProvider>,
          { theme$: themeService.theme$ }
        ),
        {
          onClose: (flyout) => {
            onCancel(flyout);
            setFlyoutRef(undefined);
          },
          outsideClickCloses: false,
          'aria-label': ControlGroupStrings.manageControl.getFlyoutCreateTitle(),
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
    'aria-label': ControlGroupStrings.management.getManageButtonTitle(),
    'data-test-subj': 'controls-create-button',
    onClick: () => {
      createNewControl();
      if (closePopover) {
        closePopover();
      }
    },
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
