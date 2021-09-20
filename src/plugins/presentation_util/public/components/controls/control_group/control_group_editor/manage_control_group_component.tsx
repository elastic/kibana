/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import useMount from 'react-use/lib/useMount';
import React, { useState } from 'react';
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
  EuiToolTip,
  EuiButtonIcon,
} from '@elastic/eui';

import { ControlGroupStrings } from '../control_group_strings';
import { ControlsPanels, ControlStyle, ControlWidth } from '../../types';
import { PresentationOverlaysService } from '../../../../services/overlays';
import { toMountPoint } from '../../../../../../kibana_react/public';
import { CONTROL_LAYOUT_OPTIONS, CONTROL_WIDTH_OPTIONS } from '../control_group_constants';

interface ManageControlGroupProps {
  panels: ControlsPanels;
  controlStyle: ControlStyle;
  setControlStyle: (style: ControlStyle) => void;
  setAllPanelWidths: (newWidth: ControlWidth) => void;
  openFlyout: PresentationOverlaysService['openFlyout'];
}

const ManageControlGroupFlyout = ({
  panels,
  controlStyle,
  setControlStyle,
  setAllPanelWidths,
}: Omit<ManageControlGroupProps, 'openFlyout'>) => {
  const [currentControlStyle, setCurrentControlStyle] = useState<ControlStyle>(controlStyle);
  const [selectedWidth, setSelectedWidth] = useState<ControlWidth>();

  useMount(() => {
    if (!panels || Object.keys(panels).length === 0) return;
    const firstWidth = panels[Object.keys(panels)[0]].width;
    if (Object.values(panels).every((panel) => panel.width === firstWidth)) {
      setSelectedWidth(firstWidth);
    }
  });

  return (
    <>
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="m">
          <h2 id="flyoutTitle">{ControlGroupStrings.management.getFlyoutTitle()}</h2>
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
          idSelected={currentControlStyle}
          onChange={(newControlStyle) => {
            setControlStyle(newControlStyle as ControlStyle);
            setCurrentControlStyle(newControlStyle as ControlStyle);
          }}
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
              onChange={(newWidth: string) => {
                setAllPanelWidths(newWidth as ControlWidth);
                setSelectedWidth(newWidth as ControlWidth);
              }}
            />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty iconType="trash" color="danger" aria-label={'delete-all'} size="s">
              {ControlGroupStrings.management.getDeleteAllButtonTitle()}
            </EuiButtonEmpty>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutBody>
    </>
  );
};

export const ManageControlGroupComponent = ({
  setAllPanelWidths,
  setControlStyle,
  controlStyle,
  openFlyout,
  panels,
}: ManageControlGroupProps) => {
  return (
    <EuiToolTip content={ControlGroupStrings.management.getManageButtonTitle()}>
      <EuiButtonIcon
        aria-label={ControlGroupStrings.management.getManageButtonTitle()}
        iconType="gear"
        color="text"
        data-test-subj="inputControlsSortingButton"
        onClick={() => {
          openFlyout(
            toMountPoint(
              <ManageControlGroupFlyout
                panels={panels}
                controlStyle={controlStyle}
                setControlStyle={setControlStyle}
                setAllPanelWidths={setAllPanelWidths}
              />
            )
          );
        }}
      />
    </EuiToolTip>
  );
};
