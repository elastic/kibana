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

import React, { useEffect, useState } from 'react';
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
  EuiSwitch,
  EuiTextColor,
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
import { getDataControlFieldRegistry } from './data_control_editor_tools';
interface EditControlProps {
  embeddable?: ControlEmbeddable<DataControlInput>;
  isCreate: boolean;
  title?: string;
  width: ControlWidth;
  onSave: (type?: string) => void;
  grow: boolean;
  onCancel: () => void;
  removeControl?: () => void;
  updateGrow?: (grow: boolean) => void;
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
}

const FieldPicker = withSuspense(LazyFieldPicker, null);
const DataViewPicker = withSuspense(LazyDataViewPicker, null);

export const ControlEditor = ({
  embeddable,
  isCreate,
  title,
  width,
  grow,
  onSave,
  onCancel,
  removeControl,
  updateGrow,
  updateTitle,
  updateWidth,
  onTypeEditorChange,
  getRelevantDataViewId,
  setLastUsedDataViewId,
}: EditControlProps) => {
  const {
    dataViews: { getIdsWithTitle, getDefaultId, get },
    controls: { getControlFactory },
  } = pluginServices.getServices();
  const [state, setState] = useState<ControlEditorState>({
    dataViewListItems: [],
  });

  const [defaultTitle, setDefaultTitle] = useState<string>();
  const [currentTitle, setCurrentTitle] = useState(title);
  const [currentWidth, setCurrentWidth] = useState(width);
  const [currentGrow, setCurrentGrow] = useState(grow);
  const [controlEditorValid, setControlEditorValid] = useState(false);
  const [selectedField, setSelectedField] = useState<string | undefined>(
    embeddable ? embeddable.getInput().fieldName : undefined
  );

  const [fieldRegistry, setFieldRegistry] = useState<DataControlFieldRegistry>();
  useEffect(() => {
    (async () => {
      if (state.selectedDataView?.id) {
        setFieldRegistry(await getDataControlFieldRegistry(await get(state.selectedDataView.id)));
      }
    })();
  }, [state.selectedDataView?.id, get]);

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
              selectedDataViewId={dataView?.id}
              onChangeDataViewId={(dataViewId) => {
                setLastUsedDataViewId?.(dataViewId);
                if (dataViewId === dataView?.id) return;

                onTypeEditorChange({ dataViewId });
                setSelectedField(undefined);
                get(dataViewId).then((newDataView) => {
                  setState((s) => ({ ...s, selectedDataView: newDataView }));
                });
              }}
              trigger={{
                label:
                  state.selectedDataView?.getName() ??
                  ControlGroupStrings.manageControl.getSelectDataViewMessage(),
              }}
            />
          </EuiFormRow>
          <EuiFormRow label={ControlGroupStrings.manageControl.getFieldTitle()}>
            <FieldPicker
              filterPredicate={(field: DataViewField) => {
                return Boolean(fieldRegistry?.[field.name]);
              }}
              selectedFieldName={selectedField}
              dataView={dataView}
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
              placeholder={defaultTitle}
              value={currentTitle}
              onChange={(e) => {
                updateTitle(e.target.value || defaultTitle);
                setCurrentTitle(e.target.value);
              }}
            />
          </EuiFormRow>
          <EuiFormRow label={ControlGroupStrings.manageControl.getWidthInputTitle()}>
            <>
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
              {updateGrow && (
                <>
                  <EuiSpacer size="s" />
                  <EuiSwitch
                    label={ControlGroupStrings.manageControl.getGrowSwitchTitle()}
                    color="primary"
                    checked={currentGrow}
                    onChange={() => {
                      setCurrentGrow(!currentGrow);
                      updateGrow(!currentGrow);
                    }}
                    data-test-subj="control-editor-grow-switch"
                  />
                </>
              )}
            </>
          </EuiFormRow>
          {CustomSettings && (factory as IEditableControlFactory).controlEditorOptionsComponent && (
            <EuiFormRow label={ControlGroupStrings.manageControl.getControlSettingsTitle()}>
              <CustomSettings
                onChange={onTypeEditorChange}
                initialInput={embeddable?.getInput()}
                fieldType={fieldRegistry[selectedField].field.type}
              />
            </EuiFormRow>
          )}
          {removeControl && (
            <>
              <EuiSpacer size="l" />
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
            </>
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
