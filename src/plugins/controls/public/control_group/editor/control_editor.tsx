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
import useAsync from 'react-use/lib/useAsync';
import { BehaviorSubject } from 'rxjs';

import {
  EuiButtonGroup,
  EuiDescribedFormGroup,
  EuiFieldText,
  EuiFlexGroup,
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
  useBatchedOptionalPublishingSubjects,
  useBatchedPublishingSubjects,
} from '@kbn/presentation-publishing';
import {
  LazyDataViewPicker,
  LazyFieldPicker,
  withSuspense,
} from '@kbn/presentation-util-plugin/public';

import { TIME_SLIDER_CONTROL } from '../../../common';
import {
  DEFAULT_CONTROL_GROW,
  DEFAULT_CONTROL_WIDTH,
} from '../../../common/control_group/control_group_constants';
import { pluginServices } from '../../services';
import { ControlWidth, DefaultControlApi, IEditableControlFactory } from '../../types';
import { ControlGroupStrings } from '../control_group_strings';
import { ControlGroupApi } from '../types';
import { getDataControlFieldRegistry } from './data_control_editor_tools';
import { CONTROL_WIDTH_OPTIONS } from './editor_constants';

export interface ControlEditorProps {
  api?: DefaultControlApi; // if defined, we are editing an existing control; otherwise, we are creating a new control
  parentApi: ControlGroupApi; // controls must always have a parent API, so pass it in
  stateManager: {
    dataViewId$: BehaviorSubject<string | undefined>;
    fieldName$: BehaviorSubject<string | undefined>;
    grow: BehaviorSubject<boolean | undefined>;
    width: BehaviorSubject<ControlWidth | undefined>;
    settings: BehaviorSubject<object | undefined>;
  };
  // onSave: (type?: string) => void;
  // onCancel: () => void;
}

const FieldPicker = withSuspense(LazyFieldPicker, null);
const DataViewPicker = withSuspense(LazyDataViewPicker, null);

export const ControlEditor = ({
  parentApi: controlGroup,
  api,
  stateManager,
}: ControlEditorProps) => {
  const {
    dataViews: { getIdsWithTitle, get },
    controls: { getControlFactory, getControlTypes },
  } = pluginServices.getServices();

  const [panelTitle] = useBatchedOptionalPublishingSubjects(
    api?.panelTitle
    // controlGroup.lastUsedDataViewId
  );

  const [selectedDataViewId, selectedFieldName, selectedGrow, selectedWidth, customSettings] =
    useBatchedPublishingSubjects(
      stateManager.dataViewId$,
      stateManager.fieldName$,
      stateManager.grow,
      stateManager.width,
      stateManager.settings
    );

  // const editorConfig = controlGroup.select((state) => state.componentState.editorConfig);
  const [currentTitle, setCurrentTitle] = useState<string>('');
  const [selectedControlType, setSelectedControlType] = useState<string | undefined>(api?.type);

  const [controlEditorValid, setControlEditorValid] = useState(false);
  // const [customSettings, setCustomSettings] = useState<Partial<ControlInput>>();

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

  useEffect(() => {
    setControlEditorValid(
      Boolean(selectedFieldName) && Boolean(selectedDataView) && Boolean(selectedControlType)
    );
  }, [selectedFieldName, setControlEditorValid, selectedDataView, selectedControlType]);

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
            fieldRegistry && selectedFieldName
              ? !fieldRegistry[selectedFieldName]?.compatibleControlTypes.includes(controlType)
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
                fieldSelected: Boolean(selectedFieldName),
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
  }, [selectedFieldName, fieldRegistry, getControlFactory, getControlTypes, selectedControlType]);

  // const CustomSettingsComponent = useMemo(() => {
  //   console.log('here 4');

  //   if (!selectedControlType || !selectedFieldName || !fieldRegistry) return;

  //   const controlFactory = getControlFactory(selectedControlType);
  //   const CustomSettings = (controlFactory as IEditableControlFactory)
  //     .controlEditorOptionsComponent;

  //   if (!CustomSettings) return;

  //   return (
  //     <EuiDescribedFormGroup
  //       ratio="third"
  //       title={
  //         <h2>
  //           {ControlGroupStrings.manageControl.controlTypeSettings.getFormGroupTitle(
  //             controlFactory.getDisplayName()
  //           )}
  //         </h2>
  //       }
  //       description={ControlGroupStrings.manageControl.controlTypeSettings.getFormGroupDescription(
  //         controlFactory.getDisplayName()
  //       )}
  //       data-test-subj="control-editor-custom-settings"
  //     >
  //       <CustomSettings
  //         onChange={(settings) => stateManager.settings.next(settings)}
  //         initialInput={customSettings}
  //         fieldType={fieldRegistry[selectedFieldName].field.type}
  //         setControlEditorValid={setControlEditorValid}
  //       />
  //     </EuiDescribedFormGroup>
  //   );
  // }, [
  //   selectedControlType,
  //   selectedFieldName,
  //   customSettings,
  //   stateManager.settings,
  //   getControlFactory,
  //   fieldRegistry,
  // ]);

  return (
    <>
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="m">
          <h2>
            {!Boolean(api)
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
            {/* {!editorConfig?.hideDataViewSelector && ( */}
            <EuiFormRow label={ControlGroupStrings.manageControl.dataSource.getDataViewTitle()}>
              <DataViewPicker
                dataViews={dataViewListItems}
                selectedDataViewId={selectedDataViewId}
                onChangeDataViewId={(newDataViewId) => {
                  if (newDataViewId !== selectedDataViewId) {
                    stateManager.dataViewId$.next(newDataViewId);
                    stateManager.fieldName$.next(undefined);
                  }
                }}
                trigger={{
                  label:
                    selectedDataView?.getName() ??
                    ControlGroupStrings.manageControl.dataSource.getSelectDataViewMessage(),
                }}
                selectableProps={{ isLoading: dataViewListLoading }}
              />
            </EuiFormRow>
            {/* )} */}
            <EuiFormRow label={ControlGroupStrings.manageControl.dataSource.getFieldTitle()}>
              <FieldPicker
                filterPredicate={(field: DataViewField) => {
                  return Boolean(fieldRegistry?.[field.name]);
                  // const customPredicate = controlGroup.fieldFilterPredicate?.(field) ?? true;
                  // return Boolean(fieldRegistry?.[field.name]) && customPredicate;
                }}
                selectedFieldName={selectedFieldName}
                dataView={selectedDataView}
                onSelectField={(field) => {
                  setSelectedControlType(fieldRegistry?.[field.name]?.compatibleControlTypes[0]);
                  const newDefaultTitle = field.displayName ?? field.name;
                  if (!currentTitle || currentTitle === selectedFieldName) {
                    setCurrentTitle(newDefaultTitle);
                  }
                  stateManager.fieldName$.next(field.name);
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
                placeholder={selectedFieldName}
                value={currentTitle}
                onChange={(e) => setCurrentTitle(e.target.value)}
              />
            </EuiFormRow>
            {/* {!editorConfig?.hideWidthSettings && ( */}
            <EuiFormRow
              label={ControlGroupStrings.manageControl.displaySettings.getWidthInputTitle()}
            >
              <div>
                <EuiButtonGroup
                  color="primary"
                  legend={ControlGroupStrings.management.controlWidth.getWidthSwitchLegend()}
                  options={CONTROL_WIDTH_OPTIONS}
                  idSelected={selectedWidth ?? DEFAULT_CONTROL_WIDTH}
                  onChange={(newWidth: string) => stateManager.width.next(newWidth as ControlWidth)}
                />
                <EuiSpacer size="s" />
                <EuiSwitch
                  label={ControlGroupStrings.manageControl.displaySettings.getGrowSwitchTitle()}
                  color="primary"
                  checked={selectedGrow === undefined ? DEFAULT_CONTROL_GROW : selectedGrow}
                  onChange={() => stateManager.grow.next(!selectedGrow)}
                  data-test-subj="control-editor-grow-switch"
                />
              </div>
            </EuiFormRow>
            {/* )} */}
          </EuiDescribedFormGroup>
          {/* {CustomSettingsComponent} */}
          {/* {!editorConfig?.hideAdditionalSettings ? CustomSettingsComponent : null} */}
          {/* {removeControl && (
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
          )} */}
        </EuiForm>
      </EuiFlyoutBody>
      <EuiFlyoutFooter>
        <EuiFlexGroup responsive={false} justifyContent="spaceBetween">
          {/* <EuiFlexItem grow={false}>
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
          </EuiFlexItem> */}
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </>
  );
};
