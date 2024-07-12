/* * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useEffect, useMemo, useState } from 'react';
import useAsync from 'react-use/lib/useAsync';

import {
  EuiButton,
  EuiButtonEmpty,
  EuiButtonGroup,
  EuiCallOut,
  EuiDescribedFormGroup,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiForm,
  EuiFormRow,
  EuiIcon,
  EuiKeyPadMenu,
  EuiKeyPadMenuItem,
  EuiSpacer,
  EuiSwitch,
  EuiTitle,
  EuiToolTip,
} from '@elastic/eui';
import {
  ControlWidth,
  DEFAULT_CONTROL_GROW,
  DEFAULT_CONTROL_WIDTH,
} from '@kbn/controls-plugin/common';
import { CONTROL_WIDTH_OPTIONS } from '@kbn/controls-plugin/public';
import { DataControlFieldRegistry } from '@kbn/controls-plugin/public/types';
import { DataViewField } from '@kbn/data-views-plugin/common';
import { DataViewsPublicPluginStart } from '@kbn/data-views-plugin/public';
import { useBatchedPublishingSubjects } from '@kbn/presentation-publishing';
import {
  LazyDataViewPicker,
  LazyFieldPicker,
  withSuspense,
} from '@kbn/presentation-util-plugin/public';

import { getAllControlTypes, getControlFactory } from '../control_factory_registry';
import { ControlGroupApi } from '../control_group/types';
import { ControlStateManager } from '../types';
import { DataControlEditorStrings } from './data_control_constants';
import { getDataControlFieldRegistry } from './data_control_editor_utils';
import { DataControlFactory, DefaultDataControlState, isDataControlFactory } from './types';

export interface ControlEditorProps<
  State extends DefaultDataControlState = DefaultDataControlState
> {
  controlId?: string; // if provided, then editing existing control; otherwise, creating a new control
  controlType?: string;
  onCancel: () => void;
  onSave: (type?: string) => void;
  stateManager: ControlStateManager<State>;
  parentApi: ControlGroupApi; // controls must always have a parent API
  services: {
    dataViews: DataViewsPublicPluginStart;
  };
}

const FieldPicker = withSuspense(LazyFieldPicker, null);
const DataViewPicker = withSuspense(LazyDataViewPicker, null);

const CompatibleControlTypesComponent = ({
  fieldRegistry,
  selectedFieldName,
  selectedControlType,
  setSelectedControlType,
}: {
  fieldRegistry?: DataControlFieldRegistry;
  selectedFieldName: string;
  selectedControlType?: string;
  setSelectedControlType: (type: string) => void;
}) => {
  const dataControlFactories = useMemo(() => {
    return getAllControlTypes()
      .map((type) => getControlFactory(type))
      .filter((factory) => {
        return isDataControlFactory(factory);
      });
  }, []);

  return (
    <EuiKeyPadMenu data-test-subj={`controlTypeMenu`} aria-label={'type'}>
      {dataControlFactories.map((factory) => {
        const disabled =
          fieldRegistry && selectedFieldName
            ? !fieldRegistry[selectedFieldName]?.compatibleControlTypes.includes(factory.type)
            : true;
        const keyPadMenuItem = (
          <EuiKeyPadMenuItem
            key={factory.type}
            id={`create__${factory.type}`}
            aria-label={factory.getDisplayName()}
            data-test-subj={`create__${factory.type}`}
            isSelected={factory.type === selectedControlType}
            disabled={disabled}
            onClick={() => setSelectedControlType(factory.type)}
            label={factory.getDisplayName()}
          >
            <EuiIcon type={factory.getIconType()} size="l" />
          </EuiKeyPadMenuItem>
        );

        return disabled ? (
          <EuiToolTip
            key={`disabled__${factory.type}`}
            content={DataControlEditorStrings.manageControl.dataSource.getControlTypeErrorMessage({
              fieldSelected: Boolean(selectedFieldName),
              controlType: factory.getDisplayName(),
            })}
          >
            {keyPadMenuItem}
          </EuiToolTip>
        ) : (
          keyPadMenuItem
        );
      })}
    </EuiKeyPadMenu>
  );
};

export const DataControlEditor = ({
  controlId,
  controlType,
  onSave,
  onCancel,
  stateManager,
  parentApi: controlGroup,
  /** TODO: These should not be props */
  services: { dataViews: dataViewService },
}: ControlEditorProps) => {
  const [
    selectedDataViewId,
    selectedFieldName,
    currentTitle,
    selectedGrow,
    selectedWidth,
    defaultGrow,
    defaultWidth,
  ] = useBatchedPublishingSubjects(
    stateManager.dataViewId,
    stateManager.fieldName,
    stateManager.title,
    stateManager.grow,
    stateManager.width,
    controlGroup.grow,
    controlGroup.width
    // controlGroup.lastUsedDataViewId, // TODO: Implement last used data view id
  );

  const [selectedFieldDisplayName, setSelectedFieldDisplayName] = useState(selectedFieldName);
  const [selectedControlType, setSelectedControlType] = useState<string | undefined>(controlType);
  const [controlEditorValid, setControlEditorValid] = useState(false);
  /** TODO: Make `editorConfig`  work when refactoring the `ControlGroupRenderer` */
  // const editorConfig = controlGroup.getEditorConfig();

  // TODO: Maybe remove `useAsync` - see https://github.com/elastic/kibana/pull/182842#discussion_r1624909709
  const {
    loading: dataViewListLoading,
    value: dataViewListItems = [],
    error: dataViewListError,
  } = useAsync(() => {
    return dataViewService.getIdsWithTitle();
  });

  // TODO: Maybe remove `useAsync` - see https://github.com/elastic/kibana/pull/182842#discussion_r1624909709
  const {
    loading: dataViewLoading,
    value: { selectedDataView, fieldRegistry } = {
      selectedDataView: undefined,
      fieldRegistry: undefined,
    },
    error: fieldListError,
  } = useAsync(async () => {
    if (!selectedDataViewId) {
      return;
    }
    const dataView = await dataViewService.get(selectedDataViewId);
    const registry = await getDataControlFieldRegistry(dataView);
    return {
      selectedDataView: dataView,
      fieldRegistry: registry,
    };
  }, [selectedDataViewId]);

  useEffect(() => {
    setControlEditorValid(
      Boolean(selectedFieldName) && Boolean(selectedDataView) && Boolean(selectedControlType)
    );
  }, [selectedFieldName, setControlEditorValid, selectedDataView, selectedControlType]);

  const CustomSettingsComponent = useMemo(() => {
    if (!selectedControlType || !selectedFieldName || !fieldRegistry) return;

    const controlFactory = getControlFactory(selectedControlType) as DataControlFactory;
    const CustomSettings = controlFactory.CustomOptionsComponent;

    if (!CustomSettings) return;

    return (
      <EuiDescribedFormGroup
        ratio="third"
        title={
          <h2>
            {DataControlEditorStrings.manageControl.controlTypeSettings.getFormGroupTitle(
              controlFactory.getDisplayName()
            )}
          </h2>
        }
        description={DataControlEditorStrings.manageControl.controlTypeSettings.getFormGroupDescription(
          controlFactory.getDisplayName()
        )}
        data-test-subj="control-editor-custom-settings"
      >
        <CustomSettings stateManager={stateManager} setControlEditorValid={setControlEditorValid} />
      </EuiDescribedFormGroup>
    );
  }, [fieldRegistry, selectedControlType, selectedFieldName, stateManager]);

  return (
    <>
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="m">
          <h2>
            {!controlType
              ? DataControlEditorStrings.manageControl.getFlyoutCreateTitle()
              : DataControlEditorStrings.manageControl.getFlyoutEditTitle()}
          </h2>
        </EuiTitle>
      </EuiFlyoutHeader>
      <EuiFlyoutBody data-test-subj="control-editor-flyout">
        <EuiForm fullWidth>
          <EuiDescribedFormGroup
            ratio="third"
            title={<h2>{DataControlEditorStrings.manageControl.dataSource.getFormGroupTitle()}</h2>}
            description={DataControlEditorStrings.manageControl.dataSource.getFormGroupDescription()}
          >
            {/* {!editorConfig?.hideDataViewSelector && ( */}
            <EuiFormRow
              label={DataControlEditorStrings.manageControl.dataSource.getDataViewTitle()}
            >
              {dataViewListError ? (
                <EuiCallOut
                  color="danger"
                  iconType="error"
                  title={DataControlEditorStrings.manageControl.dataSource.getDataViewListErrorTitle()}
                >
                  <p>{dataViewListError.message}</p>
                </EuiCallOut>
              ) : (
                <DataViewPicker
                  dataViews={dataViewListItems}
                  selectedDataViewId={selectedDataViewId}
                  onChangeDataViewId={(newDataViewId) => {
                    stateManager.dataViewId.next(newDataViewId);
                    setSelectedControlType(undefined);
                  }}
                  trigger={{
                    label:
                      selectedDataView?.getName() ??
                      DataControlEditorStrings.manageControl.dataSource.getSelectDataViewMessage(),
                  }}
                  selectableProps={{ isLoading: dataViewListLoading }}
                />
              )}
            </EuiFormRow>
            {/* )} */}

            <EuiFormRow label={DataControlEditorStrings.manageControl.dataSource.getFieldTitle()}>
              {fieldListError ? (
                <EuiCallOut
                  color="danger"
                  iconType="error"
                  title={DataControlEditorStrings.manageControl.dataSource.getFieldListErrorTitle()}
                >
                  <p>{fieldListError.message}</p>
                </EuiCallOut>
              ) : (
                <FieldPicker
                  filterPredicate={(field: DataViewField) => {
                    /** TODO: Make `fieldFilterPredicate` work when refactoring the `ControlGroupRenderer` */
                    // const customPredicate = controlGroup.fieldFilterPredicate?.(field) ?? true;
                    return Boolean(fieldRegistry?.[field.name]);
                  }}
                  selectedFieldName={selectedFieldName}
                  dataView={selectedDataView}
                  onSelectField={(field) => {
                    setSelectedControlType(fieldRegistry?.[field.name]?.compatibleControlTypes[0]);
                    const newDefaultTitle = field.displayName ?? field.name;
                    stateManager.fieldName.next(field.name);
                    setSelectedFieldDisplayName(newDefaultTitle);
                    if (!currentTitle || currentTitle === selectedFieldDisplayName) {
                      stateManager.title.next(newDefaultTitle);
                    }
                  }}
                  selectableProps={{ isLoading: dataViewListLoading || dataViewLoading }}
                />
              )}
            </EuiFormRow>
            <EuiFormRow
              label={DataControlEditorStrings.manageControl.dataSource.getControlTypeTitle()}
            >
              {/* wrapping in `div` so that focus gets passed properly to the form row */}
              <div>
                <CompatibleControlTypesComponent
                  fieldRegistry={fieldRegistry}
                  selectedFieldName={selectedFieldName}
                  selectedControlType={selectedControlType}
                  setSelectedControlType={setSelectedControlType}
                />
              </div>
            </EuiFormRow>
          </EuiDescribedFormGroup>
          <EuiDescribedFormGroup
            ratio="third"
            title={
              <h2>{DataControlEditorStrings.manageControl.displaySettings.getFormGroupTitle()}</h2>
            }
            description={DataControlEditorStrings.manageControl.displaySettings.getFormGroupDescription()}
          >
            <EuiFormRow
              label={DataControlEditorStrings.manageControl.displaySettings.getTitleInputTitle()}
            >
              <EuiFieldText
                data-test-subj="control-editor-title-input"
                placeholder={selectedFieldDisplayName ?? selectedFieldName}
                value={currentTitle}
                onChange={(e) => stateManager.title.next(e.target.value)}
              />
            </EuiFormRow>
            {/* {!editorConfig?.hideWidthSettings && ( */}
            <EuiFormRow
              label={DataControlEditorStrings.manageControl.displaySettings.getWidthInputTitle()}
            >
              <div>
                <EuiButtonGroup
                  color="primary"
                  legend={DataControlEditorStrings.management.controlWidth.getWidthSwitchLegend()}
                  options={CONTROL_WIDTH_OPTIONS}
                  idSelected={selectedWidth ?? defaultWidth ?? DEFAULT_CONTROL_WIDTH}
                  onChange={(newWidth: string) => stateManager.width.next(newWidth as ControlWidth)}
                />
                <EuiSpacer size="s" />
                <EuiSwitch
                  label={DataControlEditorStrings.manageControl.displaySettings.getGrowSwitchTitle()}
                  color="primary"
                  checked={
                    (selectedGrow === undefined ? defaultGrow : selectedGrow) ??
                    DEFAULT_CONTROL_GROW
                  }
                  onChange={() => stateManager.grow.next(!selectedGrow)}
                  data-test-subj="control-editor-grow-switch"
                />
              </div>
            </EuiFormRow>
            {/* )} */}
          </EuiDescribedFormGroup>
          {CustomSettingsComponent}
          {/* {!editorConfig?.hideAdditionalSettings ? CustomSettingsComponent : null} */}
          {controlId && (
            <>
              <EuiSpacer size="l" />
              <EuiButtonEmpty
                aria-label={`delete-${currentTitle ?? selectedFieldName}`}
                iconType="trash"
                flush="left"
                color="danger"
                onClick={() => {
                  onCancel();
                  controlGroup.removePanel(controlId);
                }}
              >
                {DataControlEditorStrings.manageControl.getDeleteButtonTitle()}
              </EuiButtonEmpty>
            </>
          )}
        </EuiForm>
      </EuiFlyoutBody>
      <EuiFlyoutFooter>
        <EuiFlexGroup responsive={false} justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              aria-label={`cancel-${currentTitle ?? selectedFieldName}`}
              data-test-subj="control-editor-cancel"
              iconType="cross"
              onClick={() => {
                onCancel();
              }}
            >
              {DataControlEditorStrings.manageControl.getCancelTitle()}
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton
              aria-label={`save-${currentTitle ?? selectedFieldName}`}
              data-test-subj="control-editor-save"
              iconType="check"
              color="primary"
              disabled={!controlEditorValid}
              onClick={() => {
                onSave();
              }}
            >
              {DataControlEditorStrings.manageControl.getSaveChangesTitle()}
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </>
  );
};
