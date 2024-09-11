/* * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useMemo, useState } from 'react';
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
import { DataViewField } from '@kbn/data-views-plugin/common';
import { DataViewsPublicPluginStart } from '@kbn/data-views-plugin/public';
import {
  LazyDataViewPicker,
  LazyFieldPicker,
  withSuspense,
} from '@kbn/presentation-util-plugin/public';
import { DataControlFieldRegistry } from '../../../types';
import { CONTROL_WIDTH_OPTIONS } from '../../..';
import { ControlWidth, DEFAULT_CONTROL_GROW, DEFAULT_CONTROL_WIDTH } from '../../../../common';

import { getAllControlTypes, getControlFactory } from '../../control_factory_registry';
import { ControlGroupApi } from '../../control_group/types';
import { DataControlEditorStrings } from './data_control_constants';
import { getDataControlFieldRegistry } from './data_control_editor_utils';
import { DataControlFactory, DefaultDataControlState, isDataControlFactory } from './types';

export interface ControlEditorProps<
  State extends DefaultDataControlState = DefaultDataControlState
> {
  initialState: Partial<State>;
  controlType?: string;
  controlId?: string;
  initialDefaultPanelTitle?: string;
  controlGroupApi: ControlGroupApi; // controls must always have a parent API
  onCancel: (newState: Partial<State>) => void;
  onSave: (newState: Partial<State>, type: string) => void;
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
      .filter((factory) => isDataControlFactory(factory))
      .sort(
        (
          { order: orderA = 0, getDisplayName: getDisplayNameA },
          { order: orderB = 0, getDisplayName: getDisplayNameB }
        ) => {
          const orderComparison = orderB - orderA; // sort descending by order
          return orderComparison === 0
            ? getDisplayNameA().localeCompare(getDisplayNameB()) // if equal order, compare display names
            : orderComparison;
        }
      );
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

export const DataControlEditor = <State extends DefaultDataControlState = DefaultDataControlState>({
  initialState,
  controlId,
  controlType,
  initialDefaultPanelTitle,
  onSave,
  onCancel,
  controlGroupApi,
  /** TODO: These should not be props */
  services: { dataViews: dataViewService },
}: ControlEditorProps<State>) => {
  const [editorState, setEditorState] = useState<Partial<State>>(initialState);
  const [defaultPanelTitle, setDefaultPanelTitle] = useState<string>(
    initialDefaultPanelTitle ?? initialState.fieldName ?? ''
  );
  const [panelTitle, setPanelTitle] = useState<string>(initialState.title ?? defaultPanelTitle);
  const [selectedControlType, setSelectedControlType] = useState<string | undefined>(controlType);
  const [controlOptionsValid, setControlOptionsValid] = useState<boolean>(true);

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
    if (!editorState.dataViewId) {
      return;
    }

    const dataView = await dataViewService.get(editorState.dataViewId);
    const registry = await getDataControlFieldRegistry(dataView);
    return {
      selectedDataView: dataView,
      fieldRegistry: registry,
    };
  }, [editorState.dataViewId]);

  const CustomSettingsComponent = useMemo(() => {
    if (!selectedControlType || !editorState.fieldName || !fieldRegistry) return;
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
          initialState={initialState}
          field={fieldRegistry[editorState.fieldName].field}
          updateState={(newState) => setEditorState({ ...editorState, ...newState })}
          setControlEditorValid={setControlOptionsValid}
          controlGroupApi={controlGroupApi}
        />
      </EuiDescribedFormGroup>
    );
  }, [fieldRegistry, selectedControlType, initialState, editorState, controlGroupApi]);

  return (
    <>
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="m">
          <h2>
            {!controlId // if no ID, then we are creating a new control
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
                  selectedDataViewId={editorState.dataViewId}
                  onChangeDataViewId={(newDataViewId) => {
                    setEditorState({ ...editorState, dataViewId: newDataViewId });
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
                  selectedFieldName={editorState.fieldName}
                  dataView={selectedDataView}
                  onSelectField={(field) => {
                    setEditorState({ ...editorState, fieldName: field.name });

                    /**
                     * make sure that the new field is compatible with the selected control type and, if it's not,
                     * reset the selected control type to the **first** compatible control type
                     */
                    const newCompatibleControlTypes =
                      fieldRegistry?.[field.name]?.compatibleControlTypes ?? [];
                    if (
                      !selectedControlType ||
                      !newCompatibleControlTypes.includes(selectedControlType!)
                    ) {
                      setSelectedControlType(newCompatibleControlTypes[0]);
                    }

                    /**
                     * set the control title (i.e. the one set by the user) + default title (i.e. the field display name)
                     */
                    const newDefaultTitle = field.displayName ?? field.name;
                    setDefaultPanelTitle(newDefaultTitle);
                    const currentTitle = editorState.title;
                    if (!currentTitle || currentTitle === newDefaultTitle) {
                      setPanelTitle(newDefaultTitle);
                    }

                    setControlOptionsValid(true); // reset options state
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
                  selectedFieldName={editorState.fieldName}
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
                  setEditorState({
                    ...editorState,
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
                  idSelected={editorState.width ?? DEFAULT_CONTROL_WIDTH}
                  onChange={(newWidth: string) =>
                    setEditorState({ ...editorState, width: newWidth as ControlWidth })
                  }
                />
                <EuiSpacer size="s" />
                <EuiSwitch
                  label={DataControlEditorStrings.manageControl.displaySettings.getGrowSwitchTitle()}
                  color="primary"
                  checked={editorState.grow ?? DEFAULT_CONTROL_GROW}
                  onChange={() => setEditorState({ ...editorState, grow: !editorState.grow })}
                  data-test-subj="control-editor-grow-switch"
                />
              </div>
            </EuiFormRow>
            {/* )} */}
          </EuiDescribedFormGroup>
          {CustomSettingsComponent}
          {controlId && (
            <>
              <EuiSpacer size="l" />
              <EuiButtonEmpty
                aria-label={`delete-${editorState.title ?? editorState.fieldName}`}
                iconType="trash"
                flush="left"
                color="danger"
                onClick={() => {
                  onCancel(initialState); // don't want to show "lost changes" warning
                  controlGroupApi.removePanel(controlId!);
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
              aria-label={`cancel-${editorState.title ?? editorState.fieldName}`}
              data-test-subj="control-editor-cancel"
              iconType="cross"
              onClick={() => {
                onCancel(editorState);
              }}
            >
              {DataControlEditorStrings.manageControl.getCancelTitle()}
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton
              aria-label={`save-${editorState.title ?? editorState.fieldName}`}
              data-test-subj="control-editor-save"
              iconType="check"
              color="primary"
              disabled={
                !(
                  controlOptionsValid &&
                  Boolean(editorState.fieldName) &&
                  Boolean(selectedDataView) &&
                  Boolean(selectedControlType)
                )
              }
              onClick={() => {
                onSave(editorState, selectedControlType!);
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
