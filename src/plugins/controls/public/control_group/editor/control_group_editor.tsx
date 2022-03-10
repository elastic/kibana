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

import React, { useState } from 'react';
import {
  EuiFlyoutHeader,
  EuiButtonGroup,
  EuiFlyoutBody,
  EuiFlexGroup,
  EuiFlexItem,
  EuiTitle,
  EuiFlyoutFooter,
  EuiButton,
  EuiFormRow,
  EuiButtonEmpty,
  EuiSpacer,
  EuiCheckbox,
} from '@elastic/eui';

import { ControlGroupStrings } from '../control_group_strings';
import { ControlStyle, ControlWidth } from '../../types';
import { CONTROL_LAYOUT_OPTIONS, CONTROL_WIDTH_OPTIONS } from './editor_constants';

interface EditControlGroupProps {
  width: ControlWidth;
  controlStyle: ControlStyle;
  setAllWidths: boolean;
  updateControlStyle: (controlStyle: ControlStyle) => void;
  updateWidth: (newWidth: ControlWidth) => void;
  updateAllControlWidths: (newWidth: ControlWidth) => void;
  onCancel: () => void;
  onClose: () => void;
}

export const ControlGroupEditor = ({
  width,
  controlStyle,
  setAllWidths,
  updateControlStyle,
  updateWidth,
  updateAllControlWidths,
  onCancel,
  onClose,
}: EditControlGroupProps) => {
  const [currentControlStyle, setCurrentControlStyle] = useState(controlStyle);
  const [currentWidth, setCurrentWidth] = useState(width);
  const [applyToAll, setApplyToAll] = useState(setAllWidths);

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
            idSelected={currentControlStyle}
            legend={ControlGroupStrings.management.controlStyle.getDesignSwitchLegend()}
            options={CONTROL_LAYOUT_OPTIONS}
            onChange={(newControlStyle: string) => {
              setCurrentControlStyle(newControlStyle as ControlStyle);
            }}
          />
        </EuiFormRow>
        <EuiSpacer size="m" />
        <EuiFormRow label={ControlGroupStrings.management.getDefaultWidthTitle()}>
          <EuiButtonGroup
            color="primary"
            idSelected={currentWidth}
            legend={ControlGroupStrings.management.controlWidth.getWidthSwitchLegend()}
            options={CONTROL_WIDTH_OPTIONS}
            onChange={(newWidth: string) => {
              setCurrentWidth(newWidth as ControlWidth);
            }}
          />
        </EuiFormRow>
        <EuiSpacer size="s" />
        <EuiCheckbox
          id="editControls_setAllSizesCheckbox"
          label={ControlGroupStrings.management.getSetAllWidthsToDefaultTitle()}
          checked={applyToAll}
          onChange={(e) => {
            setApplyToAll(e.target.checked);
          }}
        />
        <EuiSpacer size="l" />

        <EuiButtonEmpty
          onClick={onCancel}
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
                onClose();
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
                if (currentControlStyle && currentControlStyle !== controlStyle) {
                  updateControlStyle(currentControlStyle);
                }
                if (currentWidth && currentWidth !== width) {
                  updateWidth(currentWidth);
                }
                if (applyToAll) {
                  updateAllControlWidths(currentWidth);
                }
                onClose();
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
