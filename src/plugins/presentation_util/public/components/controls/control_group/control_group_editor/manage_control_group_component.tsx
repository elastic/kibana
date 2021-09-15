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
import { ControlStyle } from '../../types';
import { PresentationOverlaysService } from '../../../../services/overlays';
import { toMountPoint } from '../../../../../../kibana_react/public';

interface ManageControlGroupProps {
  controlStyle: ControlStyle;
  openFlyout: PresentationOverlaysService['openFlyout'];
  setControlStyle: (style: ControlStyle) => void;
}

const ManageControlGroupFlyout = ({
  controlStyle,
  setControlStyle,
}: Omit<ManageControlGroupProps, 'openFlyout'>) => {
  const [currentControlStyle, setCurrentControlStyle] = useState<ControlStyle>(controlStyle);

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

        {/* <EuiFlexGroup alignItems="center" justifyContent="flexEnd">
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
</EuiFlexGroup> */}
      </EuiFlyoutBody>
    </>
  );
};

export const ManageControlGroupComponent = ({
  controlStyle,
  openFlyout,
  setControlStyle,
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
                controlStyle={controlStyle}
                setControlStyle={setControlStyle}
              />
            )
          );
        }}
      />
    </EuiToolTip>
  );
};
