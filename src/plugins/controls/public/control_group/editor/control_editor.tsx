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

import React, { useEffect, useMemo, useRef, useState } from 'react';
import useMount from 'react-use/lib/useMount';
import useAsync from 'react-use/lib/useAsync';
import deepEqual from 'fast-deep-equal';

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
  EuiIcon,
  EuiSwitch,
  EuiTextColor,
  EuiDescribedFormGroup,
} from '@elastic/eui';
import { DataViewField } from '@kbn/data-views-plugin/common';
import {
  LazyDataViewPicker,
  LazyFieldPicker,
  withSuspense,
} from '@kbn/presentation-util-plugin/public';

import { ControlGroupStrings } from '../control_group_strings';
import {
  ControlEmbeddable,
  ControlInput,
  ControlWidth,
  DataControlEditorChanges,
  DataControlInput,
  IEditableControlFactory,
} from '../../types';
import { CONTROL_WIDTH_OPTIONS } from './editor_constants';
import { pluginServices } from '../../services';
import { getDataControlFieldRegistry } from './data_control_editor_tools';
import { useControlGroupContainer } from '../embeddable/control_group_container';

export interface EditControlProps {
  embeddable?: ControlEmbeddable<DataControlInput>;
  isCreate: boolean;
  width: ControlWidth;
  onSave: (changes: DataControlEditorChanges, type?: string) => void;
  grow: boolean;
  onCancel: (changes: DataControlEditorChanges) => void;
  removeControl?: () => void;
  getRelevantDataViewId?: () => string | undefined;
  setLastUsedDataViewId?: (newDataViewId: string) => void;
}

const FieldPicker = withSuspense(LazyFieldPicker, null);
const DataViewPicker = withSuspense(LazyDataViewPicker, null);

export const ControlEditor = ({
  embeddable,
  isCreate,
  width,
  grow,
  onSave,
  onCancel,
  removeControl,
  getRelevantDataViewId,
  setLastUsedDataViewId,
}: EditControlProps) => {
  const {
    dataViews: { getIdsWithTitle, getDefaultId, get },
    controls: { getControlFactory },
  } = pluginServices.getServices();

  const controlGroup = useControlGroupContainer();
  const editorConfig = controlGroup.select((state) => state.componentState.editorConfig);

  const [currentGrow, setCurrentGrow] = useState(grow);
  const [currentWidth, setCurrentWidth] = useState(width);
  const [defaultTitle, setDefaultTitle] = useState<string>();
  const [currentTitle, setCurrentTitle] = useState(embeddable?.getTitle() ?? '');
  const [controlEditorValid, setControlEditorValid] = useState(false);
  const [selectedDataViewId, setSelectedDataViewId] = useState<string>();
  const [selectedField, setSelectedField] = useState<string | undefined>(
    embeddable ? embeddable.getInput().fieldName : undefined
  );
  const [customSettings, setCustomSettings] = useState<Partial<ControlInput>>();

  const currentInput: Partial<DataControlInput> = useMemo(
    () => ({
      fieldName: selectedField,
      dataViewId: selectedDataViewId,
      title: currentTitle === '' ? defaultTitle ?? selectedField : currentTitle,
      ...customSettings,
    }),
    [currentTitle, defaultTitle, selectedField, selectedDataViewId, customSettings]
  );
  const startingInput = useRef(currentInput);

  useMount(() => {
    let mounted = true;
    if (selectedField) setDefaultTitle(selectedField);

    (async () => {
      if (!mounted) return;

      const initialId =
        embeddable?.getInput().dataViewId ?? getRelevantDataViewId?.() ?? (await getDefaultId());
      if (initialId) {
        setSelectedDataViewId(initialId);
        startingInput.current = { ...startingInput.current, dataViewId: initialId };
      }
    })();
    return () => {
      mounted = false;
    };
  });

  const { loading: dataViewListLoading, value: dataViewListItems = [] } = useAsync(() => {
    return getIdsWithTitle();
  });

  const {
    loading: dataViewLoading,
    value: { selectedDataView, fieldRegistry } = {
      selectedDataView: undefined,
      fieldRegistry: undefined,
    },
  } = useAsync(async () => {
    if (!selectedDataViewId) {
      return;
    }
    const dataView = await get(selectedDataViewId);
    const registry = await getDataControlFieldRegistry(dataView);
    return {
      selectedDataView: dataView,
      fieldRegistry: registry,
    };
  }, [selectedDataViewId]);

  useEffect(
    () => setControlEditorValid(Boolean(selectedField) && Boolean(selectedDataView)),
    [selectedField, setControlEditorValid, selectedDataView]
  );

  const controlType =
    selectedField && fieldRegistry && fieldRegistry[selectedField].compatibleControlTypes[0];
  const factory = controlType && getControlFactory(controlType);
  const CustomSettings =
    factory && (factory as IEditableControlFactory).controlEditorOptionsComponent;
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
      <EuiFlyoutBody data-test-subj="control-editor-flyout">
        <EuiForm fullWidth>
          <EuiDescribedFormGroup
            ratio="third"
            title={<h2>{ControlGroupStrings.manageControl.dataSource.getFormGroupTitle()}</h2>}
            description={ControlGroupStrings.manageControl.dataSource.getFormGroupDescription()}
          >
            {!editorConfig?.hideDataViewSelector && (
              <EuiFormRow label={ControlGroupStrings.manageControl.dataSource.getDataViewTitle()}>
                <DataViewPicker
                  dataViews={dataViewListItems}
                  selectedDataViewId={selectedDataViewId}
                  onChangeDataViewId={(dataViewId) => {
                    setLastUsedDataViewId?.(dataViewId);
                    if (dataViewId === selectedDataViewId) return;
                    setSelectedField(undefined);
                    setSelectedDataViewId(dataViewId);
                  }}
                  trigger={{
                    label:
                      selectedDataView?.getName() ??
                      ControlGroupStrings.manageControl.dataSource.getSelectDataViewMessage(),
                  }}
                  selectableProps={{ isLoading: dataViewListLoading }}
                />
              </EuiFormRow>
            )}
            <EuiFormRow label={ControlGroupStrings.manageControl.dataSource.getFieldTitle()}>
              <FieldPicker
                filterPredicate={(field: DataViewField) => {
                  const customPredicate = controlGroup.fieldFilterPredicate?.(field) ?? true;
                  return Boolean(fieldRegistry?.[field.name]) && customPredicate;
                }}
                selectedFieldName={selectedField}
                dataView={selectedDataView}
                onSelectField={(field) => {
                  const newDefaultTitle = field.displayName ?? field.name;
                  setDefaultTitle(newDefaultTitle);
                  setSelectedField(field.name);
                  if (!currentTitle || currentTitle === defaultTitle) {
                    setCurrentTitle(newDefaultTitle);
                  }
                }}
                selectableProps={{ isLoading: dataViewListLoading || dataViewLoading }}
              />
            </EuiFormRow>
            <EuiFormRow label={ControlGroupStrings.manageControl.dataSource.getControlTypeTitle()}>
              {factory ? (
                <EuiFlexGroup alignItems="center" gutterSize="xs" responsive={false}>
                  <EuiFlexItem grow={false}>
                    <EuiIcon type={factory.getIconType()} />
                  </EuiFlexItem>
                  <EuiFlexItem data-test-subj="control-editor-type">
                    {factory.getDisplayName()}
                  </EuiFlexItem>
                </EuiFlexGroup>
              ) : (
                <EuiTextColor color="subdued" data-test-subj="control-editor-type">
                  {ControlGroupStrings.manageControl.dataSource.noControlTypeMessage()}
                </EuiTextColor>
              )}
            </EuiFormRow>
          </EuiDescribedFormGroup>
          <EuiDescribedFormGroup
            ratio="third"
            title={<h2>{ControlGroupStrings.manageControl.displaySettings.getFormGroupTitle()}</h2>}
            description={ControlGroupStrings.manageControl.displaySettings.getFormGroupDescription()}
          >
            <EuiFormRow
              label={ControlGroupStrings.manageControl.displaySettings.getTitleInputTitle()}
            >
              <EuiFieldText
                data-test-subj="control-editor-title-input"
                placeholder={defaultTitle}
                value={currentTitle}
                onChange={(e) => setCurrentTitle(e.target.value)}
              />
            </EuiFormRow>
            {!editorConfig?.hideWidthSettings && (
              <EuiFormRow
                label={ControlGroupStrings.manageControl.displaySettings.getWidthInputTitle()}
              >
                <div>
                  <EuiButtonGroup
                    color="primary"
                    legend={ControlGroupStrings.management.controlWidth.getWidthSwitchLegend()}
                    options={CONTROL_WIDTH_OPTIONS}
                    idSelected={currentWidth}
                    onChange={(newWidth: string) => setCurrentWidth(newWidth as ControlWidth)}
                  />
                  <EuiSpacer size="s" />
                  <EuiSwitch
                    label={ControlGroupStrings.manageControl.displaySettings.getGrowSwitchTitle()}
                    color="primary"
                    checked={currentGrow}
                    onChange={() => setCurrentGrow(!currentGrow)}
                    data-test-subj="control-editor-grow-switch"
                  />
                </div>
              </EuiFormRow>
            )}
          </EuiDescribedFormGroup>
          {!editorConfig?.hideAdditionalSettings &&
            CustomSettings &&
            (factory as IEditableControlFactory).controlEditorOptionsComponent && (
              <EuiDescribedFormGroup
                ratio="third"
                title={
                  <h2>
                    {ControlGroupStrings.manageControl.controlTypeSettings.getFormGroupTitle(
                      factory.getDisplayName()
                    )}
                  </h2>
                }
                description={ControlGroupStrings.manageControl.controlTypeSettings.getFormGroupDescription(
                  factory.getDisplayName()
                )}
                data-test-subj="control-editor-custom-settings"
              >
                <CustomSettings
                  onChange={(settings) => setCustomSettings(settings)}
                  initialInput={embeddable?.getInput()}
                  fieldType={fieldRegistry?.[selectedField].field.type}
                />
              </EuiDescribedFormGroup>
            )}
          {removeControl && (
            <>
              <EuiSpacer size="l" />
              <EuiButtonEmpty
                aria-label={`delete-${currentInput.title}`}
                iconType="trash"
                flush="left"
                color="danger"
                onClick={() => {
                  onCancel({ input: currentInput, grow: currentGrow, width: currentWidth });
                  removeControl();
                }}
              >
                {ControlGroupStrings.management.getDeleteButtonTitle()}
              </EuiButtonEmpty>
            </>
          )}
        </EuiForm>
      </EuiFlyoutBody>
      <EuiFlyoutFooter>
        <EuiFlexGroup responsive={false} justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              aria-label={`cancel-${currentInput.title}`}
              data-test-subj="control-editor-cancel"
              iconType="cross"
              onClick={() => {
                const inputToReturn =
                  isCreate && deepEqual(startingInput.current, currentInput) ? {} : currentInput;
                onCancel({
                  input: inputToReturn,
                  grow: currentGrow,
                  width: currentWidth,
                });
              }}
            >
              {ControlGroupStrings.manageControl.getCancelTitle()}
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton
              aria-label={`save-${currentInput.title}`}
              data-test-subj="control-editor-save"
              iconType="check"
              color="primary"
              disabled={!controlEditorValid}
              onClick={() =>
                onSave({ input: currentInput, grow: currentGrow, width: currentWidth }, controlType)
              }
            >
              {ControlGroupStrings.manageControl.getSaveChangesTitle()}
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </>
  );
};
