/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useMemo } from 'react';
import {
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiButtonGroup,
  EuiFormLabel,
  EuiFlyoutHeader,
  EuiTitle,
  EuiFlyoutBody,
  EuiSpacer,
} from '@elastic/eui';

import { ControlGroupInput, ControlsPanels } from '../types';
import { ControlStyle, ControlWidth } from '../../types';
import { ControlGroupStrings } from '../control_group_strings';
import { CONTROL_LAYOUT_OPTIONS, CONTROL_WIDTH_OPTIONS } from '../control_group_constants';
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
    actions: { updateControlStyle, setAllControlWidths },
  } = useReduxEmbeddableContext<ControlGroupInput, typeof controlGroupReducers>();

  const dispatch = useEmbeddableDispatch();
  const { panels, controlStyle } = useEmbeddableSelector((state) => state);

  const selectedWidth = useMemo(() => {
    if (!panels || Object.keys(panels).length === 0) return;
    const firstWidth = panels[Object.keys(panels)[0]].width;
    if (Object.values(panels).every((panel) => panel.width === firstWidth)) {
      return firstWidth;
    }
  }, [panels]);

  return (
    <>
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="m">
          <h2>{ControlGroupStrings.management.getFlyoutTitle()}</h2>
        </EuiTitle>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        <EuiTitle size="s">
          <h3>{ControlGroupStrings.management.getDesignTitle()}</h3>
        </EuiTitle>
        <EuiSpacer size="s" />
        <EuiButtonGroup
          legend={ControlGroupStrings.management.controlStyle.getDesignSwitchLegend()}
          options={CONTROL_LAYOUT_OPTIONS}
          idSelected={controlStyle}
          onChange={(newControlStyle) =>
            dispatch(updateControlStyle(newControlStyle as ControlStyle))
          }
        />
        <EuiSpacer size="m" />
        <EuiTitle size="s">
          <h3>{ControlGroupStrings.management.getLayoutTitle()}</h3>
        </EuiTitle>
        <EuiSpacer size="s" />

        <EuiFlexGroup alignItems="center" justifyContent="flexEnd">
          <EuiFlexItem grow={false}>
            <EuiFormLabel>
              {ControlGroupStrings.management.controlWidth.getChangeAllControlWidthsTitle()}
            </EuiFormLabel>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButtonGroup
              idSelected={selectedWidth ?? ''}
              buttonSize="compressed"
              legend={ControlGroupStrings.management.controlWidth.getWidthSwitchLegend()}
              options={CONTROL_WIDTH_OPTIONS}
              onChange={(newWidth: string) =>
                dispatch(setAllControlWidths(newWidth as ControlWidth))
              }
            />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              onClick={deleteAllEmbeddables}
              aria-label={'delete-all'}
              iconType="trash"
              color="danger"
              size="s"
            >
              {ControlGroupStrings.management.getDeleteAllButtonTitle()}
            </EuiButtonEmpty>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutBody>
    </>
  );
};
