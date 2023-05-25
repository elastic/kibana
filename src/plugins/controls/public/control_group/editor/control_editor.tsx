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
import useAsync from 'react-use/lib/useAsync';

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
import { DataViewField } from '@kbn/data-views-plugin/common';
import {
  LazyDataViewPicker,
  LazyFieldPicker,
  withSuspense,
} from '@kbn/presentation-util-plugin/public';

import { ControlGroupStrings } from '../control_group_strings';
import {
  ControlEmbeddable,
  ControlWidth,
  DataControlInput,
  IEditableControlFactory,
} from '../../types';
import { CONTROL_WIDTH_OPTIONS } from './editor_constants';
import { pluginServices } from '../../services';
import { getDataControlFieldRegistry } from './data_control_editor_tools';
import { useControlGroupContainer } from '../embeddable/control_group_container';

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

  const controlGroup = useControlGroupContainer();
  const editorConfig = controlGroup.select((state) => state.componentState.editorConfig);

  const [defaultTitle, setDefaultTitle] = useState<string>();
  const [currentTitle, setCurrentTitle] = useState(title ?? '');
  const [currentWidth, setCurrentWidth] = useState(width);
  const [currentGrow, setCurrentGrow] = useState(grow);
  const [controlEditorValid, setControlEditorValid] = useState(false);
  const [selectedField, setSelectedField] = useState<string | undefined>(
    embeddable ? embeddable.getInput().fieldName : undefined
  );
  const [selectedDataViewId, setSelectedDataViewId] = useState<string>();

  useMount(() => {
    let mounted = true;
    if (selectedField) setDefaultTitle(selectedField);

    (async () => {
      if (!mounted) return;

      const initialId =
        embeddable?.getInput().dataViewId ?? getRelevantDataViewId?.() ?? (await getDefaultId());
      if (initialId) {
        onTypeEditorChange({ dataViewId: initialId });
        setSelectedDataViewId(initialId);
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
        <EuiForm>
          {!editorConfig?.hideDataViewSelector && (
            <EuiFormRow label={ControlGroupStrings.manageControl.getDataViewTitle()}>
              <DataViewPicker
                dataViews={dataViewListItems}
                selectedDataViewId={selectedDataViewId}
                onChangeDataViewId={(dataViewId) => {
                  setLastUsedDataViewId?.(dataViewId);
                  if (dataViewId === selectedDataViewId) return;
                  onTypeEditorChange({ dataViewId });
                  setSelectedField(undefined);
                  setSelectedDataViewId(dataViewId);
                }}
                trigger={{
                  label:
                    selectedDataView?.getName() ??
                    ControlGroupStrings.manageControl.getSelectDataViewMessage(),
                }}
                selectableProps={{ isLoading: dataViewListLoading }}
              />
            </EuiFormRow>
          )}
          <EuiFormRow label={ControlGroupStrings.manageControl.getFieldTitle()}>
            <FieldPicker
              filterPredicate={(field: DataViewField) => {
                const customPredicate = controlGroup.fieldFilterPredicate?.(field) ?? true;
                return Boolean(fieldRegistry?.[field.name]) && customPredicate;
              }}
              selectedFieldName={selectedField}
              dataView={selectedDataView}
              onSelectField={(field) => {
                onTypeEditorChange({
                  fieldName: field.name,
                });
                const newDefaultTitle = field.displayName ?? field.name;
                setDefaultTitle(newDefaultTitle);
                setSelectedField(field.name);
                if (!currentTitle || currentTitle === defaultTitle) {
                  setCurrentTitle(newDefaultTitle);
                  updateTitle(newDefaultTitle);
                }
              }}
              selectableProps={{ isLoading: dataViewListLoading || dataViewLoading }}
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
          {!editorConfig?.hideWidthSettings && (
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
          )}
          {!editorConfig?.hideAdditionalSettings &&
            CustomSettings &&
            (factory as IEditableControlFactory).controlEditorOptionsComponent && (
              <EuiFormRow label={ControlGroupStrings.manageControl.getControlSettingsTitle()}>
                <CustomSettings
                  onChange={onTypeEditorChange}
                  initialInput={embeddable?.getInput()}
                  fieldType={fieldRegistry?.[selectedField].field.type}
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
