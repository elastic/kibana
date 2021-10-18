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
} from '@elastic/eui';

import {
  CONTROL_LAYOUT_OPTIONS,
  CONTROL_WIDTH_OPTIONS,
  DEFAULT_CONTROL_WIDTH,
} from '../control_group_constants';
import { ControlGroupInput } from '../types';
import { pluginServices } from '../../../../services';
import { ControlStyle, ControlWidth } from '../../types';
import { ControlGroupStrings } from '../control_group_strings';
import { controlGroupReducers } from '../state/control_group_reducers';
import { useReduxContainerContext } from '../../../redux_embeddables/redux_embeddable_context';

export const EditControlGroup = () => {
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
  const [checked, setChecked] = useState(false);

  const onChange = (e) => {
    setChecked(e.target.checked);
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
            idSelected={controlStyle}
            onChange={(newControlStyle) =>
              dispatch(setControlStyle(newControlStyle as ControlStyle))
            }
          />
        </EuiFormRow>
        <EuiSpacer size="m" />
        <EuiFormRow label={ControlGroupStrings.management.getDefaultWidthTitle()}>
          <EuiButtonGroup
            color="primary"
            idSelected={defaultControlWidth ?? DEFAULT_CONTROL_WIDTH}
            legend={ControlGroupStrings.management.controlWidth.getWidthSwitchLegend()}
            options={CONTROL_WIDTH_OPTIONS}
            onChange={(newWidth: string) =>
              dispatch(setDefaultControlWidth(newWidth as ControlWidth))
            }
          />
        </EuiFormRow>
        <EuiSpacer size="s" />
        <EuiCheckbox
          id="widthsCheckbox"
          label={ControlGroupStrings.management.getSetAllWidthsToDefaultTitle()}
          checked={checked}
          onChange={(e) => onChange(e)}
        />
        <EuiSpacer size="l" />

        <EuiButtonEmpty
          onClick={() => {
            if (!containerActions?.removeEmbeddable) return;
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
    </>
  );
};
