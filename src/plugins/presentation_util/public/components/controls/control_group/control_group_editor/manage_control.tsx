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

import React, { useEffect, useState } from 'react';
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
import { ControlEditorComponent, ControlPanelState, ControlWidth } from '../../types';

interface ManageControlProps {
  title?: string;
  onSave: () => void;
  width: ControlWidth;
  onCancel: () => void;
  removeControl?: () => void;
  controlEditorComponent?: ControlEditorComponent;
  updateTitle: (title: string) => void;
  updateWidth: (newWidth: ControlWidth) => void;
}

export const ManageControlComponent = ({
  controlEditorComponent,
  removeControl,
  updateTitle,
  updateWidth,
  onCancel,
  onSave,
  title,
  width,
}: ManageControlProps) => {
  const [currentTitle, setCurrentTitle] = useState(title);
  const [currentWidth, setCurrentWidth] = useState(width);

  const [controlEditorValid, setControlEditorValid] = useState(false);
  const [editorValid, setEditorValid] = useState(false);

  useEffect(() => setEditorValid(Boolean(currentTitle)), [currentTitle]);

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
                updateWidth(newWidth as ControlWidth);
              }}
            />
          </EuiFormRow>

          <EuiSpacer size="l" />
          {controlEditorComponent &&
            controlEditorComponent({ setValidState: setControlEditorValid })}
          <EuiSpacer size="l" />
          {removeControl && (
            <EuiButton
              aria-label={`delete-${title}`}
              iconType="trash"
              color="danger"
              onClick={() => {
                onCancel();
                removeControl();
              }}
            >
              {ControlGroupStrings.floatingActions.getRemoveButtonTitle()}
            </EuiButton>
          )}
        </EuiForm>
      </EuiFlyoutBody>
      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              aria-label={`delete-${title}`}
              iconType="cross"
              onClick={() => {
                onCancel();
              }}
            >
              {ControlGroupStrings.manageControl.getCancelTitle()}
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton
              aria-label={`delete-${title}`}
              iconType="check"
              color="primary"
              disabled={!editorValid || !controlEditorValid}
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
