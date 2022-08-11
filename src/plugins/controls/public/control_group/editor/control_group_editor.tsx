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

import fastIsEqual from 'fast-deep-equal';
import React, { useCallback, useState } from 'react';
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
  EuiForm,
  EuiSwitch,
  EuiText,
  EuiHorizontalRule,
} from '@elastic/eui';

import { CONTROL_LAYOUT_OPTIONS } from './editor_constants';
import { ControlGroupStrings } from '../control_group_strings';
import { ControlStyle } from '../../types';
import { ParentIgnoreSettings } from '../..';
import { ControlGroupInput } from '..';
import { getDefaultControlGroupInput } from '../../../common';

interface EditControlGroupProps {
  initialInput: ControlGroupInput;
  controlCount: number;
  updateInput: (input: Partial<ControlGroupInput>) => void;
  onDeleteAll: () => void;
  onClose: () => void;
}

type EditorControlGroupInput = ControlGroupInput;

const editorControlGroupInputIsEqual = (a: ControlGroupInput, b: ControlGroupInput) =>
  fastIsEqual(a, b);

export const ControlGroupEditor = ({
  controlCount,
  initialInput,
  updateInput,
  onDeleteAll,
  onClose,
}: EditControlGroupProps) => {
  const [controlGroupEditorState, setControlGroupEditorState] = useState<EditorControlGroupInput>({
    ...getDefaultControlGroupInput(),
    ...initialInput,
  });

  const updateControlGroupEditorSetting = useCallback(
    (newSettings: Partial<ControlGroupInput>) => {
      setControlGroupEditorState({
        ...controlGroupEditorState,
        ...newSettings,
      });
    },
    [controlGroupEditorState]
  );

  const updateIgnoreSetting = useCallback(
    (newSettings: Partial<ParentIgnoreSettings>) => {
      setControlGroupEditorState({
        ...controlGroupEditorState,
        ignoreParentSettings: {
          ...(controlGroupEditorState.ignoreParentSettings ?? {}),
          ...newSettings,
        },
      });
    },
    [controlGroupEditorState]
  );

  const applyChangesToInput = useCallback(() => {
    const inputToApply = { ...controlGroupEditorState };
    if (!editorControlGroupInputIsEqual(inputToApply, initialInput)) updateInput(inputToApply);
  }, [controlGroupEditorState, initialInput, updateInput]);

  return (
    <>
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="m">
          <h2>{ControlGroupStrings.management.getFlyoutTitle()}</h2>
        </EuiTitle>
      </EuiFlyoutHeader>
      <EuiFlyoutBody data-test-subj="control-group-settings-flyout">
        <EuiForm>
          <EuiFormRow label={ControlGroupStrings.management.labelPosition.getLabelPositionTitle()}>
            <EuiButtonGroup
              color="primary"
              options={CONTROL_LAYOUT_OPTIONS}
              data-test-subj="control-group-layout-options"
              idSelected={controlGroupEditorState.controlStyle}
              legend={ControlGroupStrings.management.labelPosition.getLabelPositionLegend()}
              onChange={(newControlStyle: string) => {
                // The UI copy calls this setting labelPosition, but to avoid an unnecessary migration it will be left as controlStyle in the state.
                updateControlGroupEditorSetting({ controlStyle: newControlStyle as ControlStyle });
              }}
            />
          </EuiFormRow>
          <EuiHorizontalRule margin="m" />
          <EuiFlexGroup>
            <EuiFlexItem grow={false}>
              <EuiSpacer size="xs" />
              <EuiSwitch
                data-test-subj="control-group-validate-selections"
                label={ControlGroupStrings.management.validateSelections.getValidateSelectionsTitle()}
                showLabel={false}
                checked={!Boolean(controlGroupEditorState.ignoreParentSettings?.ignoreValidations)}
                onChange={(e) => updateIgnoreSetting({ ignoreValidations: !e.target.checked })}
              />
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiTitle size="xxs">
                <h3>
                  {ControlGroupStrings.management.validateSelections.getValidateSelectionsTitle()}
                </h3>
              </EuiTitle>
              <EuiText size="s">
                <p>
                  {ControlGroupStrings.management.validateSelections.getValidateSelectionsSubTitle()}
                </p>
              </EuiText>
            </EuiFlexItem>
          </EuiFlexGroup>
          <EuiHorizontalRule margin="m" />
          <EuiFlexGroup>
            <EuiFlexItem grow={false}>
              <EuiSpacer size="xs" />
              <EuiSwitch
                data-test-subj="control-group-chaining"
                label={ControlGroupStrings.management.controlChaining.getHierarchyTitle()}
                showLabel={false}
                checked={controlGroupEditorState.chainingSystem === 'HIERARCHICAL'}
                onChange={(e) =>
                  updateControlGroupEditorSetting({
                    chainingSystem: e.target.checked ? 'HIERARCHICAL' : 'NONE',
                  })
                }
              />
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiTitle size="xxs">
                <h3>{ControlGroupStrings.management.controlChaining.getHierarchyTitle()}</h3>
              </EuiTitle>
              <EuiText size="s">
                <p>{ControlGroupStrings.management.controlChaining.getHierarchySubTitle()}</p>
              </EuiText>
            </EuiFlexItem>
          </EuiFlexGroup>
          {controlCount > 0 && (
            <>
              <EuiHorizontalRule margin="m" />
              <EuiSpacer size="m" />
              <EuiButtonEmpty
                onClick={onDeleteAll}
                data-test-subj="delete-all-controls-button"
                aria-label={'delete-all'}
                iconType="trash"
                color="danger"
                flush="left"
                size="s"
              >
                {ControlGroupStrings.management.getDeleteAllButtonTitle()}
              </EuiButtonEmpty>
            </>
          )}
        </EuiForm>
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
              data-test-subj="control-group-editor-save"
              onClick={() => {
                applyChangesToInput();
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
