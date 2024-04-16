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

import deepEqual from 'fast-deep-equal';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import useAsync from 'react-use/lib/useAsync';
import useMount from 'react-use/lib/useMount';

import {
  EuiButton,
  EuiButtonEmpty,
  EuiButtonGroup,
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
import {
  LazyDataViewPicker,
  LazyFieldPicker,
  withSuspense,
} from '@kbn/presentation-util-plugin/public';

import { TIME_SLIDER_CONTROL } from '../../../common';
import { pluginServices } from '../../services';
import {
  ControlEmbeddable,
  ControlInput,
  ControlWidth,
  DataControlEditorChanges,
  DataControlInput,
  IEditableControlFactory,
} from '../../types';
import { ControlGroupStrings } from '../control_group_strings';
import { useControlGroupContainer } from '../embeddable/control_group_container';
import { getDataControlFieldRegistry } from './data_control_editor_tools';
import { CONTROL_WIDTH_OPTIONS } from './editor_constants';

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
    controls: { getControlFactory, getControlTypes },
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
  const [selectedControlType, setSelectedControlType] = useState<string | undefined>(
    embeddable ? embeddable.type : undefined
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
    () =>
      setControlEditorValid(
        Boolean(selectedField) && Boolean(selectedDataView) && Boolean(selectedControlType)
      ),
    [selectedField, setControlEditorValid, selectedDataView, selectedControlType]
  );

  const CompatibleControlTypesComponent = useMemo(() => {
    const allDataControlTypes = getControlTypes().filter((type) => type !== TIME_SLIDER_CONTROL);
    return (
      <EuiKeyPadMenu
        data-test-subj={`controlTypeMenu`}
        aria-label={ControlGroupStrings.manageControl.dataSource.getControlTypeTitle()}
      >
        {allDataControlTypes.map((controlType) => {
          const factory = getControlFactory(controlType);

          const disabled =
            fieldRegistry && selectedField
              ? !fieldRegistry[selectedField]?.compatibleControlTypes.includes(controlType)
              : true;
          const keyPadMenuItem = (
            <EuiKeyPadMenuItem
              key={controlType}
              id={`create__${controlType}`}
              aria-label={factory.getDisplayName()}
              data-test-subj={`create__${controlType}`}
              isSelected={controlType === selectedControlType}
              disabled={disabled}
              onClick={() => setSelectedControlType(controlType)}
              label={factory.getDisplayName()}
            >
              <EuiIcon type={factory.getIconType()} size="l" />
            </EuiKeyPadMenuItem>
          );

          return disabled ? (
            <EuiToolTip
              key={`disabled__${controlType}`}
              content={ControlGroupStrings.manageControl.dataSource.getControlTypeErrorMessage({
                fieldSelected: Boolean(selectedField),
                controlType,
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
  }, [selectedField, fieldRegistry, getControlFactory, getControlTypes, selectedControlType]);

  const CustomSettingsComponent = useMemo(() => {
    if (!selectedControlType || !selectedField || !fieldRegistry) return;

    const controlFactory = getControlFactory(selectedControlType);
    const CustomSettings = (controlFactory as IEditableControlFactory)
      .controlEditorOptionsComponent;

    if (!CustomSettings) return;

    return (
      <EuiDescribedFormGroup
        ratio="third"
        title={
          <h2>
            {ControlGroupStrings.manageControl.controlTypeSettings.getFormGroupTitle(
              controlFactory.getDisplayName()
            )}
          </h2>
        }
        description={ControlGroupStrings.manageControl.controlTypeSettings.getFormGroupDescription(
          controlFactory.getDisplayName()
        )}
        data-test-subj="control-editor-custom-settings"
      >
        <CustomSettings
          onChange={(settings) => setCustomSettings(settings)}
          initialInput={embeddable?.getInput()}
          fieldType={fieldRegistry[selectedField].field.type}
          setControlEditorValid={setControlEditorValid}
        />
      </EuiDescribedFormGroup>
    );
  }, [selectedControlType, selectedField, getControlFactory, fieldRegistry, embeddable]);

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
                  setSelectedControlType(fieldRegistry?.[field.name]?.compatibleControlTypes[0]);
                  if (!currentTitle || currentTitle === defaultTitle) {
                    setCurrentTitle(newDefaultTitle);
                  }
                }}
                selectableProps={{ isLoading: dataViewListLoading || dataViewLoading }}
              />
            </EuiFormRow>
            <EuiFormRow label={ControlGroupStrings.manageControl.dataSource.getControlTypeTitle()}>
              {CompatibleControlTypesComponent}
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
          {!editorConfig?.hideAdditionalSettings ? CustomSettingsComponent : null}
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
                onSave(
                  { input: currentInput, grow: currentGrow, width: currentWidth },
                  selectedControlType
                )
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
