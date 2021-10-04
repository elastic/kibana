/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useMemo } from 'react';
import {
  EuiFlyoutHeader,
  EuiButtonEmpty,
  EuiButtonGroup,
  EuiFlyoutBody,
  EuiFormRow,
  EuiSpacer,
  EuiSwitch,
  EuiTitle,
} from '@elastic/eui';

import { EuiFlexGroup } from '@elastic/eui/src/components/flex/flex_group';
import { ControlGroupInput, ControlsPanels } from '../types';
import { ControlStyle, ControlWidth } from '../../types';
import { ControlGroupStrings } from '../control_group_strings';
import {
  CONTROL_LAYOUT_OPTIONS,
  CONTROL_WIDTH_OPTIONS,
  DEFAULT_CONTROL_WIDTH,
} from '../control_group_constants';
import { useReduxEmbeddableContext } from '../../../redux_embeddables/redux_embeddable_context';
import { controlGroupReducers } from '../state/control_group_reducers';

interface ManageControlGroupProps {
  panels: ControlsPanels;
  controlStyle: ControlStyle;
  deleteAllEmbeddables: () => void;
  setControlStyle: (style: ControlStyle) => void;
  setAllPanelWidths: (newWidth: ControlWidth) => void;
}

export const ManageControlGroup = ({ deleteAllEmbeddables }: ManageControlGroupProps) => {
  const {
    useEmbeddableSelector,
    useEmbeddableDispatch,
    actions: { setControlStyle, setAllControlWidths, setDefaultControlWidth },
  } = useReduxEmbeddableContext<ControlGroupInput, typeof controlGroupReducers>();

  const dispatch = useEmbeddableDispatch();
  const { panels, controlStyle, defaultControlWidth } = useEmbeddableSelector((state) => state);

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
        <EuiFormRow label={ControlGroupStrings.management.getDefaultWidthTitle()}>
          <EuiButtonEmpty
            onClick={() =>
              dispatch(setAllControlWidths(defaultControlWidth ?? DEFAULT_CONTROL_WIDTH))
            }
            aria-label={'delete-all'}
            iconType="trash"
            color="primary"
            flush="left"
            size="s"
          >
            {ControlGroupStrings.management.getSetAllWidthsToDefaultTitle()}
          </EuiButtonEmpty>
        </EuiFormRow>

        <EuiSpacer size="xl" />

        <EuiButtonEmpty
          onClick={deleteAllEmbeddables}
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
