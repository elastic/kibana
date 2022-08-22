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

import React, { useEffect, useMemo, useState } from 'react';
import useMount from 'react-use/lib/useMount';

import {
  EuiButton,
  EuiButtonEmpty,
  EuiButtonGroup,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiForm,
  EuiFormRow,
  EuiIcon,
  EuiSpacer,
  EuiSwitch,
  EuiTextColor,
  EuiTitle,
} from '@elastic/eui';
import { DataView, DataViewField, DataViewListItem } from '@kbn/data-views-plugin/common';
import { IFieldSubTypeMulti } from '@kbn/es-query';
import {
  LazyDataViewPicker,
  LazyFieldPicker,
  withSuspense,
} from '@kbn/presentation-util-plugin/public';

import { pluginServices } from '../../services';
import {
  ControlEmbeddable,
  ControlWidth,
  DataControlFieldRegistry,
  DataControlInput,
  IEditableControlFactory,
} from '../../types';
import { ControlGroupStrings } from '../control_group_strings';
import { CONTROL_WIDTH_OPTIONS } from './editor_constants';

interface EditControlProps {
  embeddable?: ControlEmbeddable<DataControlInput>;
  grow: boolean;
  isCreate: boolean;
  title?: string;
  width: ControlWidth;
  getRelevantDataViewId?: () => string | undefined;
  onCancel: () => void;
  onSave: (type?: string) => void;
  onTypeEditorChange: (partial: Partial<DataControlInput>) => void;
  removeControl?: () => void;
  setLastUsedDataViewId?: (newDataViewId: string) => void;
  updateGrow?: (grow: boolean) => void;
  updateTitle: (title?: string) => void;
  updateWidth: (newWidth: ControlWidth) => void;
}

interface ControlEditorState {
  dataViewListItems: DataViewListItem[];
  selectedDataView?: DataView;
  selectedField?: DataViewField;
}

const FieldPicker = withSuspense(LazyFieldPicker, null);
const DataViewPicker = withSuspense(LazyDataViewPicker, null);

export const ControlEditor = ({
  embeddable,
  grow,
  isCreate,
  title,
  width,
  getRelevantDataViewId,
  onCancel,
  onSave,
  onTypeEditorChange,
  removeControl,
  setLastUsedDataViewId,
  updateGrow,
  updateTitle,
  updateWidth,
}: EditControlProps) => {
  const [controlEditorValid, setControlEditorValid] = useState(false);
  const [currentGrow, setCurrentGrow] = useState(grow);
  const [currentTitle, setCurrentTitle] = useState(title);
  const [currentWidth, setCurrentWidth] = useState(width);
  const [defaultTitle, setDefaultTitle] = useState<string>();
  const [selectedField, setSelectedField] = useState<string | undefined>(
    embeddable ? embeddable.getInput().fieldName : undefined
  );
  const [state, setState] = useState<ControlEditorState>({
    dataViewListItems: [],
  });

  const { controls, dataViews } = pluginServices.getHooks();
  const { getControlTypes, getControlFactory } = controls.useService();
  const { getIdsWithTitle, getDefaultId, get } = dataViews.useService();

  const doubleLinkFields = (dataView: DataView) => {
    // double link the parent-child relationship specifically for case-sensitivity support for options lists
    const fieldRegistry: DataControlFieldRegistry = {};

    for (const field of dataView.fields.getAll()) {
      if (!fieldRegistry[field.name]) {
        fieldRegistry[field.name] = { field, compatibleControlTypes: [] };
      }
      const parentFieldName = (field.subType as IFieldSubTypeMulti)?.multi?.parent;
      if (parentFieldName) {
        fieldRegistry[field.name].parentFieldName = parentFieldName;

        const parentField = dataView.getFieldByName(parentFieldName);
        if (!fieldRegistry[parentFieldName] && parentField) {
          fieldRegistry[parentFieldName] = { field: parentField, compatibleControlTypes: [] };
        }
        fieldRegistry[parentFieldName].childFieldName = field.name;
      }
    }
    return fieldRegistry;
  };

  const fieldRegistry = useMemo(() => {
    if (!state.selectedDataView) return;
    const newFieldRegistry: DataControlFieldRegistry = doubleLinkFields(state.selectedDataView);

    const controlFactories = getControlTypes().map(
      (controlType) => getControlFactory(controlType) as IEditableControlFactory
    );
    state.selectedDataView.fields.map((dataViewField) => {
      for (const factory of controlFactories) {
        if (factory.isFieldCompatible) {
          factory.isFieldCompatible(newFieldRegistry[dataViewField.name]);
        }
      }

      if (newFieldRegistry[dataViewField.name]?.compatibleControlTypes.length === 0) {
        delete newFieldRegistry[dataViewField.name];
      }
    });

    return newFieldRegistry;
  }, [state.selectedDataView, getControlFactory, getControlTypes]);

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
    })();
    return () => {
      mounted = false;
    };
  });

  useEffect(
    () => setControlEditorValid(Boolean(selectedField) && Boolean(state.selectedDataView)),
    [selectedField, setControlEditorValid, state.selectedDataView]
  );

  const { selectedDataView: dataView } = state;
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
              onChangeDataViewId={(dataViewId) => {
                setLastUsedDataViewId?.(dataViewId);
                if (dataViewId === dataView?.id) return;

                onTypeEditorChange({ dataViewId });
                setSelectedField(undefined);
                get(dataViewId).then((newDataView) => {
                  setState((s) => ({ ...s, selectedDataView: newDataView }));
                });
              }}
              selectedDataViewId={dataView?.id}
              trigger={{
                label:
                  state.selectedDataView?.getName() ??
                  ControlGroupStrings.manageControl.getSelectDataViewMessage(),
              }}
            />
          </EuiFormRow>
          <EuiFormRow label={ControlGroupStrings.manageControl.getFieldTitle()}>
            <FieldPicker
              dataView={dataView}
              filterPredicate={(field: DataViewField) => {
                return Boolean(fieldRegistry?.[field.name]);
              }}
              onSelectField={(field) => {
                const { parentFieldName, childFieldName } = fieldRegistry?.[field.name] ?? {};
                onTypeEditorChange({
                  fieldName: field.name,
                  ...(parentFieldName && { parentFieldName }),
                  ...(childFieldName && { childFieldName }),
                });
                const newDefaultTitle = field.displayName ?? field.name;
                setDefaultTitle(newDefaultTitle);
                setSelectedField(field.name);
                if (!currentTitle || currentTitle === defaultTitle) {
                  setCurrentTitle(newDefaultTitle);
                  updateTitle(newDefaultTitle);
                }
              }}
              selectedFieldName={selectedField}
            />
          </EuiFormRow>
          <EuiFormRow label={ControlGroupStrings.manageControl.getControlTypeTitle()}>
            {factory ? (
              <EuiFlexGroup alignItems="center" gutterSize="xs">
                <EuiFlexItem grow={false}>
                  <EuiIcon type={factory.getIconType()} />
                </EuiFlexItem>
                <EuiFlexItem data-test-subj="control-editor-type">
                  {factory.getDisplayName()}
                </EuiFlexItem>
              </EuiFlexGroup>
            ) : (
              <EuiTextColor color="subdued" data-test-subj="control-editor-type">
                {ControlGroupStrings.manageControl.getSelectFieldMessage()}
              </EuiTextColor>
            )}
          </EuiFormRow>
          <EuiFormRow label={ControlGroupStrings.manageControl.getTitleInputTitle()}>
            <EuiFieldText
              data-test-subj="control-editor-title-input"
              onChange={(e) => {
                updateTitle(e.target.value || defaultTitle);
                setCurrentTitle(e.target.value);
              }}
              placeholder={defaultTitle}
              value={currentTitle}
            />
          </EuiFormRow>
          <EuiFormRow label={ControlGroupStrings.manageControl.getWidthInputTitle()}>
            <EuiButtonGroup
              color="primary"
              idSelected={currentWidth}
              legend={ControlGroupStrings.management.controlWidth.getWidthSwitchLegend()}
              onChange={(newWidth: string) => {
                setCurrentWidth(newWidth as ControlWidth);
                updateWidth(newWidth as ControlWidth);
              }}
              options={CONTROL_WIDTH_OPTIONS}
            />
          </EuiFormRow>
          {updateGrow ? (
            <EuiFormRow>
              <EuiSwitch
                color="primary"
                checked={currentGrow}
                data-test-subj="control-editor-grow-switch"
                label={ControlGroupStrings.manageControl.getGrowSwitchTitle()}
                onChange={() => {
                  setCurrentGrow(!currentGrow);
                  updateGrow(!currentGrow);
                }}
              />
            </EuiFormRow>
          ) : null}
          {CustomSettings && (factory as IEditableControlFactory).controlEditorOptionsComponent && (
            <EuiFormRow label={ControlGroupStrings.manageControl.getControlSettingsTitle()}>
              <CustomSettings initialInput={embeddable?.getInput()} onChange={onTypeEditorChange} />
            </EuiFormRow>
          )}
          {removeControl && (
            <>
              <EuiSpacer size="l" />
              <EuiButtonEmpty
                aria-label={`delete-${title}`}
                color="danger"
                flush="left"
                iconType="trash"
                onClick={() => {
                  onCancel();
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
        <EuiFlexGroup justifyContent="spaceBetween" responsive={false}>
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
              color="primary"
              data-test-subj="control-editor-save"
              disabled={!controlEditorValid}
              iconType="check"
              onClick={() => onSave(controlType)}
            >
              {ControlGroupStrings.manageControl.getSaveChangesTitle()}
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </>
  );
};
