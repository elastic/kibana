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

import { omit } from 'lodash';
import fastIsEqual from 'fast-deep-equal';
import React, { useCallback, useMemo, useState } from 'react';
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
  EuiForm,
  EuiAccordion,
  useGeneratedHtmlId,
  EuiSwitch,
  EuiText,
  EuiHorizontalRule,
} from '@elastic/eui';

import { CONTROL_LAYOUT_OPTIONS, CONTROL_WIDTH_OPTIONS } from './editor_constants';
import { ControlGroupStrings } from '../control_group_strings';
import { ControlStyle, ControlWidth } from '../../types';
import { ParentIgnoreSettings } from '../..';
import { ControlsPanels } from '../types';
import { ControlGroupInput } from '..';
import {
  DEFAULT_CONTROL_WIDTH,
  getDefaultControlGroupInput,
} from '../../../common/control_group/control_group_constants';

interface EditControlGroupProps {
  initialInput: ControlGroupInput;
  updateInput: (input: Partial<ControlGroupInput>) => void;
  onDeleteAll: () => void;
  onClose: () => void;
}

type EditorControlGroupInput = ControlGroupInput &
  Required<Pick<ControlGroupInput, 'defaultControlWidth'>>;

const editorControlGroupInputIsEqual = (a: ControlGroupInput, b: ControlGroupInput) =>
  fastIsEqual(a, b);

export const ControlGroupEditor = ({
  initialInput,
  updateInput,
  onDeleteAll,
  onClose,
}: EditControlGroupProps) => {
  const [resetAllWidths, setResetAllWidths] = useState(false);
  const advancedSettingsAccordionId = useGeneratedHtmlId({ prefix: 'advancedSettingsAccordion' });

  const [controlGroupEditorState, setControlGroupEditorState] = useState<EditorControlGroupInput>({
    defaultControlWidth: DEFAULT_CONTROL_WIDTH,
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

  const fullQuerySyncActive = useMemo(
    () =>
      !Object.values(omit(controlGroupEditorState.ignoreParentSettings, 'ignoreValidations')).some(
        Boolean
      ),
    [controlGroupEditorState]
  );

  const applyChangesToInput = useCallback(() => {
    const inputToApply = { ...controlGroupEditorState };
    if (resetAllWidths) {
      const newPanels = {} as ControlsPanels;
      Object.entries(initialInput.panels).forEach(
        ([id, panel]) =>
          (newPanels[id] = {
            ...panel,
            width: inputToApply.defaultControlWidth,
          })
      );
      inputToApply.panels = newPanels;
    }
    if (!editorControlGroupInputIsEqual(inputToApply, initialInput)) updateInput(inputToApply);
  }, [controlGroupEditorState, resetAllWidths, initialInput, updateInput]);

  return (
    <>
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="m">
          <h2>{ControlGroupStrings.management.getFlyoutTitle()}</h2>
        </EuiTitle>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        <EuiForm>
          <EuiFormRow label={ControlGroupStrings.management.getLayoutTitle()}>
            <EuiButtonGroup
              color="primary"
              idSelected={controlGroupEditorState.controlStyle}
              legend={ControlGroupStrings.management.controlStyle.getDesignSwitchLegend()}
              options={CONTROL_LAYOUT_OPTIONS}
              onChange={(newControlStyle: string) => {
                updateControlGroupEditorSetting({ controlStyle: newControlStyle as ControlStyle });
              }}
            />
          </EuiFormRow>
          <EuiSpacer size="m" />
          <EuiFormRow label={ControlGroupStrings.management.getDefaultWidthTitle()}>
            <>
              <EuiButtonGroup
                color="primary"
                idSelected={controlGroupEditorState.defaultControlWidth}
                legend={ControlGroupStrings.management.controlWidth.getWidthSwitchLegend()}
                options={CONTROL_WIDTH_OPTIONS}
                onChange={(newWidth: string) => {
                  updateControlGroupEditorSetting({
                    defaultControlWidth: newWidth as ControlWidth,
                  });
                }}
              />
              <EuiSpacer size="s" />
              <EuiCheckbox
                id="editControls_setAllSizesCheckbox"
                label={ControlGroupStrings.management.getSetAllWidthsToDefaultTitle()}
                checked={resetAllWidths}
                onChange={(e) => {
                  setResetAllWidths(e.target.checked);
                }}
              />
            </>
          </EuiFormRow>
          <EuiHorizontalRule margin="m" />
          <EuiFlexGroup>
            <EuiFlexItem grow={false}>
              <EuiSpacer size="xs" />
              <EuiSwitch
                label={ControlGroupStrings.management.querySync.getQuerySettingsTitle()}
                showLabel={false}
                checked={fullQuerySyncActive}
                onChange={(e) => {
                  const newSetting = !e.target.checked;
                  updateIgnoreSetting({
                    ignoreFilters: newSetting,
                    ignoreTimerange: newSetting,
                    ignoreQuery: newSetting,
                  });
                }}
              />
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiTitle size="xxs">
                <h3>{ControlGroupStrings.management.querySync.getQuerySettingsTitle()}</h3>
              </EuiTitle>
              <EuiText size="s">
                <p>{ControlGroupStrings.management.querySync.getQuerySettingsSubtitle()}</p>
              </EuiText>
              <EuiSpacer size="s" />
              <EuiAccordion
                id={advancedSettingsAccordionId}
                initialIsOpen={!fullQuerySyncActive}
                buttonContent={ControlGroupStrings.management.querySync.getAdvancedSettingsTitle()}
              >
                <EuiSpacer size="s" />
                <EuiFormRow hasChildLabel display="columnCompressedSwitch">
                  <EuiSwitch
                    label={ControlGroupStrings.management.querySync.getIgnoreTimerangeTitle()}
                    compressed
                    checked={Boolean(controlGroupEditorState.ignoreParentSettings?.ignoreTimerange)}
                    onChange={(e) => updateIgnoreSetting({ ignoreTimerange: e.target.checked })}
                  />
                </EuiFormRow>
                <EuiFormRow hasChildLabel display="columnCompressedSwitch">
                  <EuiSwitch
                    label={ControlGroupStrings.management.querySync.getIgnoreQueryTitle()}
                    compressed
                    checked={Boolean(controlGroupEditorState.ignoreParentSettings?.ignoreQuery)}
                    onChange={(e) => updateIgnoreSetting({ ignoreQuery: e.target.checked })}
                  />
                </EuiFormRow>
                <EuiFormRow hasChildLabel display="columnCompressedSwitch">
                  <EuiSwitch
                    label={ControlGroupStrings.management.querySync.getIgnoreFilterPillsTitle()}
                    compressed
                    checked={Boolean(controlGroupEditorState.ignoreParentSettings?.ignoreFilters)}
                    onChange={(e) => updateIgnoreSetting({ ignoreFilters: e.target.checked })}
                  />
                </EuiFormRow>
              </EuiAccordion>
            </EuiFlexItem>
          </EuiFlexGroup>
          <EuiHorizontalRule margin="m" />
          <EuiFlexGroup>
            <EuiFlexItem grow={false}>
              <EuiSpacer size="xs" />
              <EuiSwitch
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
                label={ControlGroupStrings.management.controlChaining.getHierarchyTitle()}
                showLabel={false}
                checked={controlGroupEditorState.chainingSytem === 'HIERARCHICAL'}
                onChange={(e) =>
                  updateControlGroupEditorSetting({
                    chainingSytem: e.target.checked ? 'HIERARCHICAL' : 'NONE',
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
          <EuiHorizontalRule margin="m" />
          <EuiSpacer size="m" />
          <EuiButtonEmpty
            onClick={onDeleteAll}
            aria-label={'delete-all'}
            iconType="trash"
            color="danger"
            flush="left"
            size="s"
          >
            {ControlGroupStrings.management.getDeleteAllButtonTitle()}
          </EuiButtonEmpty>
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
