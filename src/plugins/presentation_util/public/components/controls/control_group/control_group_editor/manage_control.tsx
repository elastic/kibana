/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiButtonGroup,
  EuiButtonIcon,
  EuiFlyout,
  EuiFlyoutHeader,
  EuiTitle,
  EuiFlyoutBody,
} from '@elastic/eui';
import { ControlGroupStrings } from '../control_group_strings';
import { InputControlMeta, ControlWidth } from '../component/control_group_component';
import { widthOptions } from './manage_control_group_component';

interface ManageControlProps {
  onClose: () => void;
  controlMeta: InputControlMeta;
  setControlMeta: React.Dispatch<React.SetStateAction<InputControlMeta[]>>;
  index: number;
}

export const ManageControlComponent = ({
  controlMeta,
  setControlMeta,
  onClose,
  index,
}: ManageControlProps) => {
  const { title, width } = controlMeta;
  return (
    <EuiFlyout ownFocus onClose={onClose} aria-labelledby="flyoutTitle">
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="m">
          <h2 id="flyoutTitle">Edit {title}</h2>
        </EuiTitle>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        <EuiFlexGroup alignItems="center" gutterSize="m">
          <EuiFlexItem grow={false}>
            <EuiButtonGroup
              buttonSize="compressed"
              legend={ControlGroupStrings.management.controlWidth.getWidthSwitchLegend()}
              options={widthOptions}
              idSelected={width}
              onChange={(newWidth: string) =>
                setControlMeta((currentControls) => {
                  currentControls[index].width = newWidth as ControlWidth;
                  return [...currentControls];
                })
              }
            />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButtonIcon aria-label={`delete-${title}`} iconType="trash" color="danger" />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutBody>
    </EuiFlyout>
  );
};
