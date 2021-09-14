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
  EuiFieldText,
  EuiFlyoutFooter,
  EuiButton,
  EuiFormRow,
  EuiForm,
  EuiButtonEmpty,
  EuiSpacer,
} from '@elastic/eui';

import { ControlGroupStrings } from '../control_group_strings';
import { widthOptions } from '../control_group_constants';
import { ControlPanelState, ControlWidth } from '../../types';

interface ManageControlProps {
  title?: string;
  onClose: () => void;
  panel: ControlPanelState;
  removeControl: () => void;
  controlEditor?: JSX.Element;
  updateTitle: (title: string) => void;
  updatePanel: (partial: Partial<ControlPanelState>) => void;
}

export const ManageControlComponent = ({
  controlEditor,
  removeControl,
  updateTitle,
  updatePanel,
  onClose,
  title,
  panel,
}: ManageControlProps) => {
  const [currentTitle, setCurrentTitle] = useState(title);
  const [currentWidth, setCurrentWidth] = useState(panel.width);

  return (
    <>
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="m">
          <h2 id="flyoutTitle">{ControlGroupStrings.manageControl.getFlyoutTitle()}</h2>
        </EuiTitle>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        <EuiForm>
          <EuiFormRow label={ControlGroupStrings.manageControl.getTitleInputTitle()}>
            <EuiFieldText
              placeholder="Placeholder text"
              value={currentTitle}
              onChange={(e) => {
                updateTitle(e.target.value);
                setCurrentTitle(e.target.value);
              }}
              aria-label="Use aria labels when no actual label is in use"
            />
          </EuiFormRow>
          <EuiFormRow label={ControlGroupStrings.manageControl.getWidthInputTitle()}>
            <EuiButtonGroup
              buttonSize="compressed"
              legend={ControlGroupStrings.management.controlWidth.getWidthSwitchLegend()}
              options={widthOptions}
              idSelected={currentWidth}
              onChange={(newWidth: string) => {
                setCurrentWidth(newWidth as ControlWidth);
                updatePanel({ width: newWidth as ControlWidth });
              }}
            />
          </EuiFormRow>

          <EuiButton
            aria-label={`delete-${title}`}
            iconType="trash"
            color="danger"
            onClick={() => {
              onClose();
              removeControl();
            }}
          >
            {ControlGroupStrings.floatingActions.getRemoveButtonTitle()}
          </EuiButton>
        </EuiForm>
        <EuiSpacer size="l" />
        {controlEditor && controlEditor}
      </EuiFlyoutBody>
      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              aria-label={`delete-${title}`}
              iconType="cross"
              onClick={() => {
                onClose();
                removeControl();
              }}
            >
              Cancel
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton
              aria-label={`delete-${title}`}
              iconType="check"
              color="primary"
              onClick={() => {
                onClose();
                removeControl();
              }}
            >
              Save and Close
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </>
  );
};
