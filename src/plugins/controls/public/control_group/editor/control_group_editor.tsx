/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import fastIsEqual from 'fast-deep-equal';
import React, { useCallback, useState } from 'react';

import {
  EuiButton,
  EuiButtonEmpty,
  EuiButtonGroup,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiForm,
  EuiFormRow,
  EuiHorizontalRule,
  EuiSpacer,
  EuiSwitch,
  EuiTitle,
} from '@elastic/eui';

import { ControlGroupInput } from '..';
import { ParentIgnoreSettings } from '../..';
import { getDefaultControlGroupInput } from '../../../common';
import { ControlSettingTooltipLabel } from '../../components/control_setting_tooltip_label';
import { ControlStyle } from '../../types';
import { ControlGroupStrings } from '../control_group_strings';
import { CONTROL_LAYOUT_OPTIONS } from './editor_constants';

interface EditControlGroupProps {
  initialInput: ControlGroupInput;
  controlCount: number;
  updateInput: (input: Partial<ControlGroupInput>) => void;
  onDeleteAll: () => void;
  onClose: () => void;
}

const editorControlGroupInputIsEqual = (a: ControlGroupInput, b: ControlGroupInput) =>
  fastIsEqual(a, b);

export const ControlGroupEditor = ({
  controlCount,
  initialInput,
  updateInput,
  onDeleteAll,
  onClose,
}: EditControlGroupProps) => {
  const [controlGroupEditorState, setControlGroupEditorState] = useState<ControlGroupInput>({
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
    if (!editorControlGroupInputIsEqual(inputToApply, initialInput)) {
      updateInput(inputToApply);
    }
  }, [controlGroupEditorState, initialInput, updateInput]);

  return (
    <>
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="m">
          <h2>{ControlGroupStrings.management.getFlyoutTitle()}</h2>
        </EuiTitle>
      </EuiFlyoutHeader>
      <EuiFlyoutBody data-test-subj="control-group-settings-flyout">
        <EuiForm component="form" fullWidth>
          <EuiFormRow label={ControlGroupStrings.management.labelPosition.getLabelPositionTitle()}>
            <EuiButtonGroup
              color="primary"
              options={CONTROL_LAYOUT_OPTIONS}
              data-test-subj="control-group-layout-options"
              idSelected={controlGroupEditorState.controlStyle}
              legend={ControlGroupStrings.management.labelPosition.getLabelPositionLegend()}
              onChange={(newControlStyle: string) => {
                // The UI copy calls this setting labelPosition, but to avoid an unnecessary migration it will be left as controlStyle in the state.
                updateControlGroupEditorSetting({
                  controlStyle: newControlStyle as ControlStyle,
                });
              }}
            />
          </EuiFormRow>

          <EuiFormRow
            label={ControlGroupStrings.management.filteringSettings.getFilteringSettingsTitle()}
          >
            <div>
              <EuiSwitch
                compressed
                data-test-subj="control-group-filter-sync"
                label={ControlGroupStrings.management.filteringSettings.getUseGlobalFiltersTitle()}
                onChange={(e) =>
                  updateIgnoreSetting({
                    ignoreFilters: !e.target.checked,
                    ignoreQuery: !e.target.checked,
                  })
                }
                checked={
                  !Boolean(controlGroupEditorState.ignoreParentSettings?.ignoreFilters) ||
                  !Boolean(controlGroupEditorState.ignoreParentSettings?.ignoreQuery)
                }
              />
              <EuiSpacer size="s" />
              <EuiSwitch
                compressed
                data-test-subj="control-group-query-sync-time-range"
                label={ControlGroupStrings.management.filteringSettings.getUseGlobalTimeRangeTitle()}
                onChange={(e) => updateIgnoreSetting({ ignoreTimerange: !e.target.checked })}
                checked={!Boolean(controlGroupEditorState.ignoreParentSettings?.ignoreTimerange)}
              />
            </div>
          </EuiFormRow>

          <EuiFormRow
            label={ControlGroupStrings.management.selectionSettings.getSelectionSettingsTitle()}
          >
            <div>
              <EuiSwitch
                compressed
                data-test-subj="control-group-validate-selections"
                label={
                  <ControlSettingTooltipLabel
                    label={ControlGroupStrings.management.selectionSettings.validateSelections.getValidateSelectionsTitle()}
                    tooltip={ControlGroupStrings.management.selectionSettings.validateSelections.getValidateSelectionsTooltip()}
                  />
                }
                checked={!Boolean(controlGroupEditorState.ignoreParentSettings?.ignoreValidations)}
                onChange={(e) => updateIgnoreSetting({ ignoreValidations: !e.target.checked })}
              />
              <EuiSpacer size="s" />
              <EuiSwitch
                compressed
                data-test-subj="control-group-chaining"
                label={
                  <ControlSettingTooltipLabel
                    label={ControlGroupStrings.management.selectionSettings.controlChaining.getHierarchyTitle()}
                    tooltip={ControlGroupStrings.management.selectionSettings.controlChaining.getHierarchyTooltip()}
                  />
                }
                checked={controlGroupEditorState.chainingSystem === 'HIERARCHICAL'}
                onChange={(e) =>
                  updateControlGroupEditorSetting({
                    chainingSystem: e.target.checked ? 'HIERARCHICAL' : 'NONE',
                  })
                }
              />
              <EuiSpacer size="s" />
              <EuiSwitch
                compressed
                data-test-subj="control-group-auto-apply-selections"
                label={
                  <ControlSettingTooltipLabel
                    label={ControlGroupStrings.management.selectionSettings.showApplySelections.getShowApplySelectionsTitle()}
                    tooltip={ControlGroupStrings.management.selectionSettings.showApplySelections.getShowApplySelectionsTooltip()}
                  />
                }
                checked={!controlGroupEditorState.showApplySelections}
                onChange={(e) =>
                  updateControlGroupEditorSetting({
                    showApplySelections: !e.target.checked,
                  })
                }
              />
            </div>
          </EuiFormRow>

          {controlCount > 0 && (
            <>
              <EuiHorizontalRule margin="m" />
              <EuiFormRow>
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
              </EuiFormRow>
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
