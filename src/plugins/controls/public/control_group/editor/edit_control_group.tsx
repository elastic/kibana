/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useState } from 'react';
import {
  EuiTitle,
  EuiSpacer,
  EuiFormRow,
  EuiFlexItem,
  EuiFlexGroup,
  EuiFlyoutBody,
  EuiButtonGroup,
  EuiButtonEmpty,
  EuiFlyoutHeader,
  EuiCheckbox,
  EuiFlyoutFooter,
  EuiButton,
} from '@elastic/eui';

import {
  CONTROL_LAYOUT_OPTIONS,
  CONTROL_WIDTH_OPTIONS,
  DEFAULT_CONTROL_WIDTH,
} from './editor_constants';
import { ControlGroupInput } from '../types';
import { pluginServices } from '../../services';
import { ControlStyle, ControlWidth } from '../../types';
import { ControlGroupStrings } from '../control_group_strings';
import { controlGroupReducers } from '../state/control_group_reducers';
import { useReduxContainerContext } from '../../../../presentation_util/public';

interface EditControlGroupState {
  newControlStyle: ControlGroupInput['controlStyle'];
  newDefaultWidth: ControlGroupInput['defaultControlWidth'];
  setAllWidths: boolean;
}

export const EditControlGroup = ({ closeFlyout }: { closeFlyout: () => void }) => {
  const { overlays } = pluginServices.getHooks();
  const { openConfirm } = overlays.useService();

  const {
    containerActions,
    useEmbeddableSelector,
    useEmbeddableDispatch,
    actions: { setControlStyle, setAllControlWidths, setDefaultControlWidth },
  } = useReduxContainerContext<ControlGroupInput, typeof controlGroupReducers>();
  const dispatch = useEmbeddableDispatch();
  const { panels, controlStyle, defaultControlWidth } = useEmbeddableSelector((state) => state);

  const [state, setState] = useState<EditControlGroupState>({
    newControlStyle: controlStyle,
    newDefaultWidth: defaultControlWidth,
    setAllWidths: false,
  });

  const onSave = () => {
    const { newControlStyle, newDefaultWidth, setAllWidths } = state;
    if (newControlStyle && newControlStyle !== controlStyle) {
      dispatch(setControlStyle(newControlStyle));
    }
    if (newDefaultWidth && newDefaultWidth !== defaultControlWidth) {
      dispatch(setDefaultControlWidth(newDefaultWidth));
    }
    if (setAllWidths && newDefaultWidth) {
      dispatch(setAllControlWidths(newDefaultWidth));
    }
    closeFlyout();
  };

  return (
    <>
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="m">
          <h2>{ControlGroupStrings.management.getFlyoutTitle()}</h2>
        </EuiTitle>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        <EuiFormRow label={ControlGroupStrings.management.getLayoutTitle()}>
          <EuiButtonGroup
            color="primary"
            legend={ControlGroupStrings.management.controlStyle.getDesignSwitchLegend()}
            options={CONTROL_LAYOUT_OPTIONS}
            idSelected={state.newControlStyle}
            onChange={(newControlStyle) =>
              setState((s) => ({ ...s, newControlStyle: newControlStyle as ControlStyle }))
            }
          />
        </EuiFormRow>
        <EuiSpacer size="m" />
        <EuiFormRow label={ControlGroupStrings.management.getDefaultWidthTitle()}>
          <EuiButtonGroup
            color="primary"
            idSelected={state.newDefaultWidth ?? DEFAULT_CONTROL_WIDTH}
            legend={ControlGroupStrings.management.controlWidth.getWidthSwitchLegend()}
            options={CONTROL_WIDTH_OPTIONS}
            onChange={(newDefaultWidth: string) =>
              setState((s) => ({ ...s, newDefaultWidth: newDefaultWidth as ControlWidth }))
            }
          />
        </EuiFormRow>
        <EuiSpacer size="s" />
        <EuiCheckbox
          id="editControls_setAllSizesCheckbox"
          label={ControlGroupStrings.management.getSetAllWidthsToDefaultTitle()}
          checked={state.setAllWidths}
          onChange={(e) => setState((s) => ({ ...s, setAllWidths: e.target.checked }))}
        />
        <EuiSpacer size="l" />

        <EuiButtonEmpty
          onClick={() => {
            if (!containerActions?.removeEmbeddable) return;
            closeFlyout();
            openConfirm(ControlGroupStrings.management.deleteControls.getSubtitle(), {
              confirmButtonText: ControlGroupStrings.management.deleteControls.getConfirm(),
              cancelButtonText: ControlGroupStrings.management.deleteControls.getCancel(),
              title: ControlGroupStrings.management.deleteControls.getDeleteAllTitle(),
              buttonColor: 'danger',
            }).then((confirmed) => {
              if (confirmed)
                Object.keys(panels).forEach((panelId) =>
                  containerActions.removeEmbeddable(panelId)
                );
            });
          }}
          aria-label={'delete-all'}
          iconType="trash"
          color="danger"
          flush="left"
          size="s"
        >
          {ControlGroupStrings.management.getDeleteAllButtonTitle()}
        </EuiButtonEmpty>
      </EuiFlyoutBody>
      <EuiFlyoutFooter>
        <EuiFlexGroup responsive={false} justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              aria-label={`cancel-editing-group`}
              iconType="cross"
              onClick={() => {
                closeFlyout();
              }}
            >
              {ControlGroupStrings.manageControl.getCancelTitle()}
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton
              aria-label={`save-group`}
              iconType="check"
              color="primary"
              onClick={() => {
                onSave();
              }}
            >
              {ControlGroupStrings.manageControl.getSaveChangesTitle()}
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </>
  );
};
