/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useCallback, useMemo } from 'react';

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
  EuiIconTip,
  EuiSpacer,
  EuiSwitch,
  EuiTitle,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { ControlStyle, ParentIgnoreSettings } from '@kbn/controls-plugin/public';
import { useBatchedPublishingSubjects } from '@kbn/presentation-publishing';

import { ControlStateManager } from '../types';
import {
  ControlGroupEditorStrings,
  CONTROL_LAYOUT_OPTIONS,
} from './control_group_editor_constants';
import { ControlGroupApi, ControlGroupEditorState } from './types';

interface EditControlGroupProps {
  onCancel: () => void;
  onSave: () => void;
  onDeleteAll: () => void;
  stateManager: ControlStateManager<ControlGroupEditorState>;
  api: ControlGroupApi; // controls must always have a parent API
}

export const ControlGroupEditor = ({
  onCancel,
  onSave,
  onDeleteAll,
  stateManager,
  api,
}: EditControlGroupProps) => {
  const [
    children,
    selectedLabelPosition,
    selectedChainingSystem,
    selectedShowApplySelections,
    selectedIgnoreParentSettings,
  ] = useBatchedPublishingSubjects(
    api.children$,
    stateManager.labelPosition,
    stateManager.chainingSystem,
    stateManager.showApplySelections,
    stateManager.ignoreParentSettings
  );

  const controlCount = useMemo(() => Object.keys(children).length, [children]);

  const updateIgnoreSetting = useCallback(
    (newSettings: Partial<ParentIgnoreSettings>) => {
      stateManager.ignoreParentSettings.next({
        ...(selectedIgnoreParentSettings ?? {}),
        ...newSettings,
      });
    },
    [stateManager.ignoreParentSettings, selectedIgnoreParentSettings]
  );

  return (
    <>
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="m">
          <h2>{ControlGroupEditorStrings.management.getFlyoutTitle()}</h2>
        </EuiTitle>
      </EuiFlyoutHeader>
      <EuiFlyoutBody data-test-subj="control-group-settings-flyout">
        <EuiForm component="form" fullWidth>
          <EuiFormRow
            label={ControlGroupEditorStrings.management.labelPosition.getLabelPositionTitle()}
          >
            <EuiButtonGroup
              color="primary"
              options={CONTROL_LAYOUT_OPTIONS}
              data-test-subj="control-group-layout-options"
              idSelected={selectedLabelPosition}
              legend={ControlGroupEditorStrings.management.labelPosition.getLabelPositionLegend()}
              onChange={(newPosition: string) => {
                stateManager.labelPosition.next(newPosition as ControlStyle);
              }}
            />
          </EuiFormRow>

          <EuiFormRow
            label={ControlGroupEditorStrings.management.filteringSettings.getFilteringSettingsTitle()}
          >
            <div>
              <EuiSwitch
                compressed
                data-test-subj="control-group-filter-sync"
                label={ControlGroupEditorStrings.management.filteringSettings.getUseGlobalFiltersTitle()}
                onChange={(e) =>
                  updateIgnoreSetting({
                    ignoreFilters: !e.target.checked,
                    ignoreQuery: !e.target.checked,
                  })
                }
                checked={
                  !Boolean(selectedIgnoreParentSettings?.ignoreFilters) ||
                  !Boolean(selectedIgnoreParentSettings?.ignoreQuery)
                }
              />
              <EuiSpacer size="s" />
              <EuiSwitch
                compressed
                data-test-subj="control-group-query-sync-time-range"
                label={ControlGroupEditorStrings.management.filteringSettings.getUseGlobalTimeRangeTitle()}
                onChange={(e) => updateIgnoreSetting({ ignoreTimerange: !e.target.checked })}
                checked={!Boolean(selectedIgnoreParentSettings?.ignoreTimerange)}
              />
            </div>
          </EuiFormRow>

          <EuiFormRow
            label={ControlGroupEditorStrings.management.selectionSettings.getSelectionSettingsTitle()}
          >
            <div>
              <EuiSwitch
                compressed
                data-test-subj="control-group-validate-selections"
                label={
                  <ControlSettingTooltipLabel
                    label={ControlGroupEditorStrings.management.selectionSettings.validateSelections.getValidateSelectionsTitle()}
                    tooltip={ControlGroupEditorStrings.management.selectionSettings.validateSelections.getValidateSelectionsTooltip()}
                  />
                }
                checked={!Boolean(selectedIgnoreParentSettings?.ignoreValidations)}
                onChange={(e) => updateIgnoreSetting({ ignoreValidations: !e.target.checked })}
              />
              <EuiSpacer size="s" />
              <EuiSwitch
                compressed
                data-test-subj="control-group-chaining"
                label={
                  <ControlSettingTooltipLabel
                    label={ControlGroupEditorStrings.management.selectionSettings.controlChaining.getHierarchyTitle()}
                    tooltip={ControlGroupEditorStrings.management.selectionSettings.controlChaining.getHierarchyTooltip()}
                  />
                }
                checked={selectedChainingSystem === 'HIERARCHICAL'}
                onChange={(e) =>
                  stateManager.chainingSystem.next(e.target.checked ? 'HIERARCHICAL' : 'NONE')
                }
              />
              <EuiSpacer size="s" />
              <EuiSwitch
                compressed
                data-test-subj="control-group-auto-apply-selections"
                label={
                  <ControlSettingTooltipLabel
                    label={ControlGroupEditorStrings.management.selectionSettings.showApplySelections.getShowApplySelectionsTitle()}
                    tooltip={ControlGroupEditorStrings.management.selectionSettings.showApplySelections.getShowApplySelectionsTooltip()}
                  />
                }
                checked={!selectedShowApplySelections}
                onChange={(e) => stateManager.showApplySelections.next(!e.target.checked)}
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
                  {ControlGroupEditorStrings.management.getDeleteAllButtonTitle()}
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
                onCancel();
              }}
            >
              {ControlGroupEditorStrings.getCancelTitle()}
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton
              aria-label={`save-group`}
              iconType="check"
              color="primary"
              data-test-subj="control-group-editor-save"
              onClick={() => {
                onSave();
              }}
            >
              {ControlGroupEditorStrings.getSaveChangesTitle()}
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </>
  );
};

const ControlSettingTooltipLabel = ({ label, tooltip }: { label: string; tooltip: string }) => (
  <EuiFlexGroup alignItems="center" gutterSize="xs" responsive={false}>
    <EuiFlexItem grow={false}>{label}</EuiFlexItem>
    <EuiFlexItem
      grow={false}
      css={css`
        margin-top: 0px !important;
      `}
    >
      <EuiIconTip content={tooltip} position="right" />
    </EuiFlexItem>
  </EuiFlexGroup>
);
