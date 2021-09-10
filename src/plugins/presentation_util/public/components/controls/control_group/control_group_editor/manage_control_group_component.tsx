/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useState } from 'react';
import {
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiButtonGroup,
  EuiFormLabel,
  EuiFlyout,
  EuiFlyoutHeader,
  EuiTitle,
  EuiFlyoutBody,
  EuiSpacer,
  EuiToolTip,
  EuiButtonIcon,
} from '@elastic/eui';
import { ControlGroupStrings } from '../control_group_strings';
import { ControlStyle, ControlWidth, InputControlMeta } from '../component/control_group_component';

export const widthOptions = [
  {
    id: `auto`,
    label: ControlGroupStrings.management.controlWidth.getAutoWidthTitle(),
  },
  {
    id: `small`,
    label: ControlGroupStrings.management.controlWidth.getSmallWidthTitle(),
  },
  {
    id: `medium`,
    label: ControlGroupStrings.management.controlWidth.getMediumWidthTitle(),
  },
  {
    id: `large`,
    label: ControlGroupStrings.management.controlWidth.getLargeWidthTitle(),
  },
];

interface ManageControlGroupProps {
  controlStyle: ControlStyle;
  controlMeta: InputControlMeta[];
  setControlStyle: React.Dispatch<React.SetStateAction<ControlStyle>>;
  setControlMeta: React.Dispatch<React.SetStateAction<InputControlMeta[]>>;
}

export const ManageControlGroupComponent = ({
  controlMeta,
  setControlMeta,
  controlStyle,
  setControlStyle,
}: ManageControlGroupProps) => {
  const [isManagementFlyoutVisible, setIsManagementFlyoutVisible] = useState(false);

  const manageControlsButton = (
    <EuiToolTip content={ControlGroupStrings.management.getManageButtonTitle()}>
      <EuiButtonIcon
        size="xs"
        aria-label={ControlGroupStrings.management.getManageButtonTitle()}
        iconType="gear"
        color="text"
        data-test-subj="inputControlsSortingButton"
        onClick={() => setIsManagementFlyoutVisible(!isManagementFlyoutVisible)}
      />
    </EuiToolTip>
  );

  const manageControlGroupFlyout = (
    <EuiFlyout
      ownFocus
      onClose={() => setIsManagementFlyoutVisible(false)}
      aria-labelledby="flyoutTitle"
    >
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
          options={[
            {
              id: `oneLine`,
              label: ControlGroupStrings.management.controlStyle.getSingleLineTitle(),
            },
            {
              id: `twoLine`,
              label: ControlGroupStrings.management.controlStyle.getTwoLineTitle(),
            },
          ]}
          idSelected={controlStyle}
          onChange={(newControlStyle) => setControlStyle(newControlStyle as ControlStyle)}
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
              buttonSize="compressed"
              idSelected={
                controlMeta.every((currentMeta) => currentMeta?.width === controlMeta[0]?.width)
                  ? controlMeta[0]?.width
                  : ''
              }
              legend={ControlGroupStrings.management.controlWidth.getWidthSwitchLegend()}
              options={widthOptions}
              onChange={(newWidth: string) =>
                setControlMeta((currentControls) => {
                  currentControls.forEach((currentMeta) => {
                    currentMeta.width = newWidth as ControlWidth;
                  });
                  return [...currentControls];
                })
              }
            />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty iconType="trash" color="danger" aria-label={'delete-all'} size="s">
              {ControlGroupStrings.management.getDeleteAllButtonTitle()}
            </EuiButtonEmpty>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutBody>
    </EuiFlyout>
  );

  return (
    <>
      {manageControlsButton}
      {isManagementFlyoutVisible && manageControlGroupFlyout}
    </>
  );
};
