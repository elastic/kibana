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
import { ControlEditorComponent, ControlWidth } from '../../types';
import { CONTROL_WIDTH_OPTIONS } from './editor_constants';

interface ManageControlProps {
  title?: string;
  isCreate: boolean;
  onSave: () => void;
  width: ControlWidth;
  onCancel: () => void;
  removeControl?: () => void;
  controlEditorComponent?: ControlEditorComponent;
  updateTitle: (title?: string) => void;
  updateWidth: (newWidth: ControlWidth) => void;
}

export const ControlEditor = ({
  controlEditorComponent,
  removeControl,
  updateTitle,
  updateWidth,
  isCreate,
  onCancel,
  onSave,
  title,
  width,
}: ManageControlProps) => {
  const [currentTitle, setCurrentTitle] = useState(title);
  const [currentWidth, setCurrentWidth] = useState(width);

  const [controlEditorValid, setControlEditorValid] = useState(false);
  const [defaultTitle, setDefaultTitle] = useState<string>();

  return (
    <>
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="m">
          <h2>
            {isCreate
              ? ControlGroupStrings.manageControl.getFlyoutCreateTitle()
              : ControlGroupStrings.manageControl.getFlyoutEditTitle()}
          </h2>
        </EuiTitle>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        <EuiForm>
          <EuiFormRow label={ControlGroupStrings.manageControl.getWidthInputTitle()}>
            <EuiButtonGroup
              color="primary"
              legend={ControlGroupStrings.management.controlWidth.getWidthSwitchLegend()}
              options={CONTROL_WIDTH_OPTIONS}
              idSelected={currentWidth}
              onChange={(newWidth: string) => {
                setCurrentWidth(newWidth as ControlWidth);
                updateWidth(newWidth as ControlWidth);
              }}
            />
          </EuiFormRow>

          <EuiSpacer size="l" />
          {controlEditorComponent &&
            controlEditorComponent({
              setValidState: setControlEditorValid,
              setDefaultTitle: (newDefaultTitle) => {
                if (!currentTitle || currentTitle === defaultTitle) {
                  setCurrentTitle(newDefaultTitle);
                  updateTitle(newDefaultTitle);
                }
                setDefaultTitle(newDefaultTitle);
              },
            })}
          <EuiFormRow label={ControlGroupStrings.manageControl.getTitleInputTitle()}>
            <EuiFieldText
              placeholder={defaultTitle}
              value={currentTitle}
              onChange={(e) => {
                updateTitle(e.target.value || defaultTitle);
                setCurrentTitle(e.target.value);
              }}
            />
          </EuiFormRow>
          <EuiSpacer size="l" />
          {removeControl && (
            <EuiButtonEmpty
              aria-label={`delete-${title}`}
              iconType="trash"
              flush="left"
              color="danger"
              onClick={() => {
                onCancel();
                removeControl();
              }}
            >
              {ControlGroupStrings.management.getDeleteButtonTitle()}
            </EuiButtonEmpty>
          )}
        </EuiForm>
      </EuiFlyoutBody>
      <EuiFlyoutFooter>
        <EuiFlexGroup responsive={false} justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              aria-label={`cancel-${title}`}
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
              aria-label={`save-${title}`}
              iconType="check"
              color="primary"
              disabled={!controlEditorValid}
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
