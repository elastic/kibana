/* * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { omit, pick } from 'lodash';
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
import { DEFAULT_DATA_CONTROL_EDITOR_KEYS } from './constants';
import { DataControlEditorStrings } from './data_control_constants';
import { getDataControlFieldRegistry } from './data_control_editor_utils';
import { DataControlEditorState } from './open_data_control_editor';
import { DataControlFactory, isDataControlFactory } from './types';

export interface ControlEditorProps<State extends DataControlEditorState = DataControlEditorState> {
  initialState: State;
  parentApi: ControlGroupApi; // controls must always have a parent API
  onCancel: (newState: State) => void;
  onSave: (newState: State, type: string) => void;
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
  selectedFieldName?: string;
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

export const DataControlEditor = <State extends DataControlEditorState = DataControlEditorState>({
  initialState,
  onSave,
  onCancel,
  parentApi: controlGroup,
  /** TODO: These should not be props */
  services: { dataViews: dataViewService },
}: ControlEditorProps<State>) => {
  const [defaultGrow, defaultWidth] = useBatchedPublishingSubjects(
    controlGroup.grow,
    controlGroup.width
    // controlGroup.parentApi?.lastUsedDataViewId, // TODO: Make this work
  );
  /**
   * Define two state managers for keeping track of the control state:
   * (1) `dataControlState`: Used to manage the generic state that all data controls share
   * (2) `customOptionsState`: Used to manage type-specific editor state
   */
  const [dataControlState, setDataControlState] = useState<DataControlEditorState>(
    pick(initialState, DEFAULT_DATA_CONTROL_EDITOR_KEYS)
  );
  const [customOptionsState, setCustomOptionsState] = useState<
    Omit<State, keyof DataControlEditorState>
  >(omit(initialState, DEFAULT_DATA_CONTROL_EDITOR_KEYS));

  /** The remaining state will be managed via hooks */
  const [defaultPanelTitle, setDefaultPanelTitle] = useState<string>(
    initialState.defaultPanelTitle ?? initialState.fieldName ?? ''
  );
  const [panelTitle, setPanelTitle] = useState<string>(initialState.title ?? defaultPanelTitle);
  const [selectedControlType, setSelectedControlType] = useState<string | undefined>(
    initialState.controlType
  );
  const [controlEditorValid, setControlEditorValid] = useState<boolean>(false);

  /** TODO: Make `editorConfig`  work when refactoring the `ControlGroupRenderer` */
  // const editorConfig = controlGroup.getEditorConfig();

  // TODO: Maybe remove `useAsync` - see https://github.com/elastic/kibana/pull/182842#discussion_r1624909709
  const {
    loading: dataViewListLoading,
    value: dataViewListItems = [],
    error: dataViewListError,
  } = useAsync(async () => {
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
    if (!dataControlState.dataViewId) {
      return;
    }

    const dataView = await dataViewService.get(dataControlState.dataViewId);
    const registry = await getDataControlFieldRegistry(dataView);
    return {
      selectedDataView: dataView,
      fieldRegistry: registry,
    };
  }, [dataControlState.dataViewId]);

  useEffect(() => {
    setControlEditorValid(
      Boolean(dataControlState.fieldName) &&
        Boolean(selectedDataView) &&
        Boolean(selectedControlType)
    );
  }, [dataControlState.fieldName, setControlEditorValid, selectedDataView, selectedControlType]);

  useEffect(() => {
    if (initialState.controlType === selectedControlType) {
      /** if the same type is picked, restore the initial state */
      setCustomOptionsState(omit(initialState, DEFAULT_DATA_CONTROL_EDITOR_KEYS));
    } else {
      /** when selectedControlType changes to a new type, empty type-specific state */
      setCustomOptionsState({} as Omit<State, keyof DataControlEditorState>);
    }
  }, [initialState, selectedControlType]);

  const CustomSettingsComponent = useMemo(() => {
    if (!selectedControlType || !dataControlState.fieldName || !fieldRegistry) return;

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
        <CustomSettings
          initialState={customOptionsState}
          updateState={(newState) => setCustomOptionsState({ ...customOptionsState, ...newState })}
          setControlEditorValid={setControlEditorValid}
        />
      </EuiDescribedFormGroup>
    );
  }, [fieldRegistry, selectedControlType, dataControlState, customOptionsState]);

  return (
    <>
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="m">
          <h2>
            {!initialState.controlId // if no ID, then we are creating a new control
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
                  selectedDataViewId={dataControlState.dataViewId}
                  onChangeDataViewId={(newDataViewId) => {
                    setDataControlState({ ...dataControlState, dataViewId: newDataViewId });
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
                  selectedFieldName={dataControlState.fieldName}
                  dataView={selectedDataView}
                  onSelectField={(field) => {
                    setDataControlState({ ...dataControlState, fieldName: field.name });
                    setSelectedControlType(fieldRegistry?.[field.name]?.compatibleControlTypes[0]);

                    const newDefaultTitle = field.displayName ?? field.name;
                    setDefaultPanelTitle(newDefaultTitle);
                    const currentTitle = dataControlState.title;
                    if (!currentTitle || currentTitle === newDefaultTitle) {
                      setPanelTitle(newDefaultTitle);
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
                  selectedFieldName={dataControlState.fieldName}
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
                placeholder={defaultPanelTitle}
                value={panelTitle}
                onChange={(e) => {
                  setPanelTitle(e.target.value ?? '');
                  setDataControlState({
                    ...dataControlState,
                    title: e.target.value === '' ? undefined : e.target.value,
                  });
                }}
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
                  idSelected={dataControlState.width ?? defaultWidth ?? DEFAULT_CONTROL_WIDTH}
                  onChange={(newWidth: string) =>
                    setDataControlState({ ...dataControlState, width: newWidth as ControlWidth })
                  }
                />
                <EuiSpacer size="s" />
                <EuiSwitch
                  label={DataControlEditorStrings.manageControl.displaySettings.getGrowSwitchTitle()}
                  color="primary"
                  checked={
                    (dataControlState.grow === undefined ? defaultGrow : dataControlState.grow) ??
                    DEFAULT_CONTROL_GROW
                  }
                  onChange={() =>
                    setDataControlState({ ...dataControlState, grow: !dataControlState.grow })
                  }
                  data-test-subj="control-editor-grow-switch"
                />
              </div>
            </EuiFormRow>
            {/* )} */}
          </EuiDescribedFormGroup>
          {CustomSettingsComponent}
          {/* {!editorConfig?.hideAdditionalSettings ? CustomSettingsComponent : null} */}
          {initialState.controlId && (
            <>
              <EuiSpacer size="l" />
              <EuiButtonEmpty
                aria-label={`delete-${dataControlState.title ?? dataControlState.fieldName}`}
                iconType="trash"
                flush="left"
                color="danger"
                onClick={() => {
                  onCancel(initialState); // don't want to show "lost changes" warning
                  controlGroup.removePanel(initialState.controlId!);
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
              aria-label={`cancel-${dataControlState.title ?? dataControlState.fieldName}`}
              data-test-subj="control-editor-cancel"
              iconType="cross"
              onClick={() => {
                onCancel({ ...dataControlState, ...customOptionsState } as State);
              }}
            >
              {DataControlEditorStrings.manageControl.getCancelTitle()}
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton
              aria-label={`save-${dataControlState.title ?? dataControlState.fieldName}`}
              data-test-subj="control-editor-save"
              iconType="check"
              color="primary"
              disabled={!controlEditorValid}
              onClick={() => {
                onSave(
                  { ...dataControlState, ...customOptionsState } as State,
                  selectedControlType!
                );
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
