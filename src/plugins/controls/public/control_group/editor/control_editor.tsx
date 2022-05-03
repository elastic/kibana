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

import React, { useEffect, useMemo, useCallback, useState } from 'react';
import useMount from 'react-use/lib/useMount';

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
  EuiToolTip,
} from '@elastic/eui';
import { DataViewListItem, DataView, DataViewField } from '@kbn/data-views-plugin/common';
import {
  LazyDataViewPicker,
  LazyFieldPicker,
  withSuspense,
} from '@kbn/presentation-util-plugin/public';

import { ControlGroupStrings } from '../control_group_strings';
import {
  ControlEmbeddable,
  ControlWidth,
  DataControlFieldRegistry,
  DataControlInput,
  IEditableControlFactory,
} from '../../types';
import { CONTROL_WIDTH_OPTIONS } from './editor_constants';
import { pluginServices } from '../../services';
interface EditControlProps {
  embeddable?: ControlEmbeddable<DataControlInput>;
  isCreate: boolean;
  title?: string;
  width: ControlWidth;
  onSave: (type: string, factory?: IEditableControlFactory) => void;
  onCancel: () => void;
  removeControl?: () => void;
  updateTitle: (title?: string) => void;
  updateWidth: (newWidth: ControlWidth) => void;
  getRelevantDataViewId?: () => string | undefined;
  setLastUsedDataViewId?: (newDataViewId: string) => void;
  onTypeEditorChange: (partial: Partial<DataControlInput>) => void;
}

interface ControlEditorState {
  dataViewListItems: DataViewListItem[];
  selectedDataView?: DataView;
  selectedField?: DataViewField;
  fieldRegistry?: DataControlFieldRegistry;
}

const FieldPicker = withSuspense(LazyFieldPicker, null);
const DataViewPicker = withSuspense(LazyDataViewPicker, null);

export const ControlEditor = ({
  embeddable,
  isCreate,
  title,
  width,
  onSave,
  onCancel,
  removeControl,
  updateTitle,
  updateWidth,
  onTypeEditorChange,
  getRelevantDataViewId,
  setLastUsedDataViewId,
}: EditControlProps) => {
  const { dataViews } = pluginServices.getHooks();
  const { getIdsWithTitle, getDefaultId, get } = dataViews.useService();

  const { controls } = pluginServices.getServices();
  const { getControlTypes, getControlFactory } = controls;
  const [state, setState] = useState<ControlEditorState>({
    dataViewListItems: [],
  });

  const [defaultTitle, setDefaultTitle] = useState<string>();
  const [currentTitle, setCurrentTitle] = useState(title);
  const [currentWidth, setCurrentWidth] = useState(width);
  const [controlEditorValid, setControlEditorValid] = useState(false);
  const [selectedField, setSelectedField] = useState<string | undefined>(
    embeddable ? embeddable.getInput().fieldName : undefined
  );

  const getCompatibleControlTypes = (dataView?: DataView) => {
    if (!dataView) return {};
    const fieldRegistry: DataControlFieldRegistry = {};
    const controlFactories = getControlTypes().map(
      (controlType) => getControlFactory(controlType) as IEditableControlFactory
    );
    dataView.fields.map((dataViewField) => {
      fieldRegistry[dataViewField.name] = { field: dataViewField, compatibleControlTypes: [] };
      for (const factory of controlFactories) {
        if (factory.isFieldCompatible) {
          factory.isFieldCompatible(fieldRegistry[dataViewField.name]);
        }
      }

      if (fieldRegistry[dataViewField.name]?.compatibleControlTypes.length === 0) {
        delete fieldRegistry[dataViewField.name];
      }
    });
    setState((s) => ({ ...s, fieldRegistry }));
    // setSelectedField(Object.keys(fieldRegistry)[0]);
  };

  useMount(() => {
    let mounted = true;
    if (selectedField) setDefaultTitle(selectedField);

    (async () => {
      const dataViewListItems = await getIdsWithTitle();
      const initialId =
        embeddable?.getInput().dataViewId ?? getRelevantDataViewId?.() ?? (await getDefaultId());
      let dataView: DataView | undefined;
      if (initialId) {
        onTypeEditorChange({ dataViewId: initialId });
        dataView = await get(initialId);
      }
      if (!mounted) return;
      setState((s) => ({
        ...s,
        selectedDataView: dataView,
        dataViewListItems,
      }));
      getCompatibleControlTypes(dataView);
    })();
    return () => {
      mounted = false;
    };
  });

  useEffect(
    () => setControlEditorValid(Boolean(selectedField) && Boolean(state.selectedDataView)),
    [selectedField, setControlEditorValid, state.selectedDataView]
  );

  const { selectedDataView: dataView, fieldRegistry } = state;
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
        <EuiForm>
          <EuiFormRow label={ControlGroupStrings.manageControl.getDataViewTitle()}>
            <DataViewPicker
              dataViews={state.dataViewListItems}
              selectedDataViewId={dataView?.id}
              onChangeDataViewId={(dataViewId) => {
                setLastUsedDataViewId?.(dataViewId);
                if (dataViewId === dataView?.id) return;

                onTypeEditorChange({ dataViewId });
                setSelectedField(undefined);
                get(dataViewId).then((newDataView) => {
                  setState((s) => ({ ...s, selectedDataView: newDataView }));
                  getCompatibleControlTypes(newDataView);
                });
              }}
              trigger={{
                label: state.selectedDataView?.title ?? 'Select data view',
              }}
            />
          </EuiFormRow>
          <EuiFormRow label={ControlGroupStrings.manageControl.getFieldTitle()}>
            <FieldPicker
              showFields={Object.keys(state.fieldRegistry ?? {})}
              selectedFieldName={selectedField}
              dataView={dataView}
              onSelectField={(field) => {
                onTypeEditorChange({ fieldName: field.name });
                const newDefaultTitle = field.displayName ?? field.name;
                setDefaultTitle(newDefaultTitle);
                setSelectedField(field.name);
                if (!currentTitle || currentTitle === defaultTitle) {
                  setCurrentTitle(newDefaultTitle);
                  updateTitle(newDefaultTitle);
                }
              }}
            />
          </EuiFormRow>

          <EuiFormRow label={ControlGroupStrings.manageControl.getControlTypeTitle()}>
            {factory ? (
              <EuiFlexGroup alignItems="center" gutterSize="xs">
                <EuiFlexItem grow={false}>
                  <EuiIcon type={factory.getIconType()} />
                </EuiFlexItem>
                <EuiFlexItem>{factory.getDisplayName()}</EuiFlexItem>
              </EuiFlexGroup>
            ) : (
              <EuiFlexGroup alignItems="center" gutterSize="xs">
                <EuiFlexItem grow={false}>
                  <EuiIcon type="alert" />
                </EuiFlexItem>
                <EuiFlexItem>
                  {ControlGroupStrings.manageControl.getSelectFieldMessage()}
                </EuiFlexItem>
              </EuiFlexGroup>
            )}
          </EuiFormRow>
          <EuiFormRow label={ControlGroupStrings.manageControl.getTitleInputTitle()}>
            <EuiFieldText
              data-test-subj="control-editor-title-input"
              placeholder={defaultTitle}
              value={currentTitle}
              onChange={(e) => {
                updateTitle(e.target.value || defaultTitle);
                setCurrentTitle(e.target.value);
              }}
            />
          </EuiFormRow>
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
          {CustomSettings && (factory as IEditableControlFactory).controlEditorOptionsComponent && (
            <EuiFormRow label={ControlGroupStrings.manageControl.getControlSettingsTitle()}>
              <CustomSettings onChange={onTypeEditorChange} initialInput={embeddable?.getInput()} />
            </EuiFormRow>
          )}
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
              data-test-subj="control-editor-cancel"
              iconType="cross"
              onClick={() => onCancel()}
            >
              {ControlGroupStrings.manageControl.getCancelTitle()}
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton
              aria-label={`save-${title}`}
              data-test-subj="control-editor-save"
              iconType="check"
              color="primary"
              disabled={!controlEditorValid}
              onClick={() => controlType && onSave(controlType, factory as IEditableControlFactory)}
            >
              {ControlGroupStrings.manageControl.getSaveChangesTitle()}
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </>
  );
};
