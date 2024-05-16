/* * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import useAsync from 'react-use/lib/useAsync';

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
import { useBatchedOptionalPublishingSubjects } from '@kbn/presentation-publishing';
import {
  LazyDataViewPicker,
  LazyFieldPicker,
  withSuspense,
} from '@kbn/presentation-util-plugin/public';

// import { getDataControlFieldRegistry } from '@kbn/controls-plugin/public/control_group/editor/data_control_editor_tools';
import { ControlWidth } from '@kbn/controls-plugin/common';
import { CONTROL_WIDTH_OPTIONS } from '@kbn/controls-plugin/public';
import { DataViewsPublicPluginStart } from '@kbn/data-views-plugin/public';
import { i18n } from '@kbn/i18n';
import { getAllControlTypes, getControlFactory } from '../control_factory_registry';
import { ControlGroupApi } from '../control_group/types';
import {
  getControlTypeErrorMessage,
  getDataControlFieldRegistry,
} from './data_control_editor_utils';
import { DataControlStateManager } from './initialize_data_control';
import { DataControlFactory, DataEditorState, isDataControlFactory } from './types';

export interface ControlEditorProps {
  controlType?: string; // if provided, then editing existing control; otherwise, creating a new control
  onCancel: (state: DataEditorState) => void;
  onSave: (state: DataEditorState, type?: string) => void;
  stateManager: DataControlStateManager;
  parentApi: ControlGroupApi; // controls must always have a parent API
  services: {
    dataViews: DataViewsPublicPluginStart;
  };
}

const FieldPicker = withSuspense(LazyFieldPicker, null);
const DataViewPicker = withSuspense(LazyDataViewPicker, null);

export const DataControlEditor = ({
  controlType,
  onSave,
  onCancel,
  stateManager,
  parentApi: controlGroup,
  /** TODO: These should not be props */
  services: { dataViews: dataViewService },
}: ControlEditorProps) => {
  const [lastUsedDataViewId, defaultGrow, defaultWidth] = useBatchedOptionalPublishingSubjects(
    controlGroup.lastUsedDataViewId,
    controlGroup.grow,
    controlGroup.width
  );

  /**
   * Duplicate all state from stateManager into React state because we do not want to actually apply the changes
   * to the control until the user hits save. This can be removed once we do inline editing with a push flyout
   */
  const [selectedDataViewId, setSelectedDataViewId] = useState(stateManager.dataViewId.getValue());
  const [selectedFieldName, setSelectedFieldName] = useState(stateManager.fieldName.getValue());
  const [selectedFieldDisplayName, setSelectedFieldDisplayName] = useState(selectedFieldName);
  const [selectedGrow, setSelectedGrow] = useState(stateManager.grow.getValue());
  const [selectedWidth, setSelectedWidth] = useState(stateManager.width.getValue());
  const [currentTitle, setCurrentTitle] = useState<string | undefined>(
    stateManager.title.getValue() || selectedFieldName
  );
  const [selectedControlType, setSelectedControlType] = useState<string | undefined>(controlType);
  // const [selectedSettings, setSelectedSettings] = useState(stateManager.settings.getValue());

  // const editorConfig = controlGroup.select((state) => state.componentState.editorConfig);

  const [controlEditorValid, setControlEditorValid] = useState(false);
  // const [customSettings, setCustomSettings] = useState<Partial<ControlInput>>();

  const { loading: dataViewListLoading, value: dataViewListItems = [] } = useAsync(() => {
    return dataViewService.getIdsWithTitle();
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
    const dataView = await dataViewService.get(selectedDataViewId);
    const registry = await getDataControlFieldRegistry(dataView);
    return {
      selectedDataView: dataView,
      fieldRegistry: registry,
    };
  }, [selectedDataViewId]);

  useEffect(() => {
    setControlEditorValid(
      Boolean(selectedFieldName) && Boolean(selectedDataView) // && Boolean(selectedControlType)
    );
  }, [selectedFieldName, setControlEditorValid, selectedDataView]);

  const dataControlFactories = useMemo(() => {
    return getAllControlTypes()
      .map((type) => getControlFactory(type))
      .filter((factory) => {
        return isDataControlFactory(factory);
      });
  }, []);

  const CompatibleControlTypesComponent = useMemo(() => {
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
              key={`disabled__${controlType}`}
              content={getControlTypeErrorMessage({
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
  }, [selectedFieldName, fieldRegistry, selectedControlType, controlType, dataControlFactories]);

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
            {i18n.translate(
              'controls.controlGroup.manageControl.controlTypeSettings.formGroupTitle',
              {
                defaultMessage: '{controlType} settings',
                values: { controlType: controlFactory.getDisplayName() },
              }
            )}
          </h2>
        }
        description={i18n.translate(
          'controls.controlGroup.manageControl.controlTypeSettings.formGroupDescription',
          {
            defaultMessage: 'Custom settings for your {controlType} control.',
            values: { controlType: controlFactory.getDisplayName().toLocaleLowerCase() },
          }
        )}
        data-test-subj="control-editor-custom-settings"
      >
        <CustomSettings stateManager={stateManager} setControlEditorValid={setControlEditorValid} />
      </EuiDescribedFormGroup>
    );
  }, [fieldRegistry, selectedControlType, selectedFieldName, stateManager]);

  const getCurrentState = useCallback(() => {
    return {
      dataViewId: selectedDataViewId,
      fieldName: selectedFieldName,
      title:
        currentTitle === '' || currentTitle === selectedFieldDisplayName ? undefined : currentTitle,
      grow: selectedGrow,
      width: selectedWidth,
    };
  }, [
    selectedDataViewId,
    selectedFieldName,
    selectedFieldDisplayName,
    currentTitle,
    selectedGrow,
    selectedWidth,
  ]);

  return (
    <>
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="m">
          <h2>
            {!controlType
              ? i18n.translate('controls.controlGroup.manageControl.createFlyoutTitle', {
                  defaultMessage: 'Create control',
                })
              : i18n.translate('controls.controlGroup.manageControl.editFlyoutTitle', {
                  defaultMessage: 'Edit control',
                })}
          </h2>
        </EuiTitle>
      </EuiFlyoutHeader>
      <EuiFlyoutBody data-test-subj="control-editor-flyout">
        <EuiForm fullWidth>
          <EuiDescribedFormGroup
            ratio="third"
            title={
              <h2>
                {i18n.translate('controls.controlGroup.manageControl.dataSource.formGroupTitle', {
                  defaultMessage: 'Data source',
                })}
              </h2>
            }
            description={i18n.translate(
              'controls.controlGroup.manageControl.dataSource.formGroupDescription',
              {
                defaultMessage:
                  'Select the data view and field that you want to create a control for.',
              }
            )}
          >
            {/* {!editorConfig?.hideDataViewSelector && ( */}
            <EuiFormRow
              label={i18n.translate(
                'controls.controlGroup.manageControl.dataSource.dataViewTitle',
                {
                  defaultMessage: 'Data view',
                }
              )}
            >
              <DataViewPicker
                dataViews={dataViewListItems}
                selectedDataViewId={selectedDataViewId}
                onChangeDataViewId={(newDataViewId) => {
                  setSelectedDataViewId(newDataViewId);
                }}
                trigger={{
                  label:
                    selectedDataView?.getName() ??
                    i18n.translate(
                      'controls.controlGroup.manageControl.dataSource.selectDataViewMessage',
                      {
                        defaultMessage: 'Please select a data view',
                      }
                    ),
                }}
                selectableProps={{ isLoading: dataViewListLoading }}
              />
            </EuiFormRow>
            {/* )} */}
            <EuiFormRow
              label={i18n.translate('controls.controlGroup.manageControl.dataSource.fieldTitle', {
                defaultMessage: 'Field',
              })}
            >
              <FieldPicker
                filterPredicate={(field: DataViewField) => {
                  return Boolean(fieldRegistry?.[field.name]);
                  // const customPredicate = controlGroup.fieldFilterPredicate?.(field) ?? true;
                  // return Boolean(fieldRegistry?.[field.name]) && customPredicate;
                }}
                selectedFieldName={selectedFieldName}
                dataView={selectedDataView}
                onSelectField={(field) => {
                  // setSelectedControlType(fieldRegistry?.[field.name]?.compatibleControlTypes[0]);
                  const newDefaultTitle = field.displayName ?? field.name;
                  setSelectedFieldName(field.name);
                  setSelectedFieldDisplayName(newDefaultTitle);
                  if (!currentTitle || currentTitle === selectedFieldDisplayName) {
                    setCurrentTitle(newDefaultTitle);
                  }
                }}
                selectableProps={{ isLoading: dataViewListLoading || dataViewLoading }}
              />
            </EuiFormRow>
            <EuiFormRow
              label={i18n.translate(
                'controls.controlGroup.manageControl.dataSource.controlTypesTitle',
                {
                  defaultMessage: 'Control type',
                }
              )}
            >
              {CompatibleControlTypesComponent}
            </EuiFormRow>
          </EuiDescribedFormGroup>
          <EuiDescribedFormGroup
            ratio="third"
            title={
              <h2>
                {i18n.translate(
                  'controls.controlGroup.manageControl.displaySettings.formGroupTitle',
                  {
                    defaultMessage: 'Display settings',
                  }
                )}
              </h2>
            }
            description={i18n.translate(
              'controls.controlGroup.manageControl.displaySettings.formGroupDescription',
              {
                defaultMessage: 'Change how the control appears on your dashboard.',
              }
            )}
          >
            <EuiFormRow
              label={i18n.translate(
                'controls.controlGroup.manageControl.displaySettings.titleInputTitle',
                {
                  defaultMessage: 'Label',
                }
              )}
            >
              <EuiFieldText
                data-test-subj="control-editor-title-input"
                placeholder={selectedFieldDisplayName ?? selectedFieldName}
                value={currentTitle}
                onChange={(e) => setCurrentTitle(e.target.value)}
              />
            </EuiFormRow>
            {/* {!editorConfig?.hideWidthSettings && ( */}
            <EuiFormRow
              label={i18n.translate(
                'controls.controlGroup.manageControl.displaySettings.widthInputTitle',
                {
                  defaultMessage: 'Minimum width',
                }
              )}
            >
              <div>
                <EuiButtonGroup
                  color="primary"
                  legend={i18n.translate(
                    'controls.controlGroup.management.layout.controlWidthLegend',
                    {
                      defaultMessage: 'Change control size',
                    }
                  )}
                  options={CONTROL_WIDTH_OPTIONS}
                  idSelected={selectedWidth ?? defaultWidth}
                  onChange={(newWidth: string) => setSelectedWidth(newWidth as ControlWidth)}
                />
                <EuiSpacer size="s" />
                <EuiSwitch
                  label={i18n.translate(
                    'controls.controlGroup.manageControl.displaySettings.growSwitchTitle',
                    {
                      defaultMessage: 'Expand width to fit available space',
                    }
                  )}
                  color="primary"
                  checked={selectedGrow === undefined ? defaultGrow : selectedGrow}
                  onChange={() => setSelectedGrow(!selectedGrow)}
                  data-test-subj="control-editor-grow-switch"
                />
              </div>
            </EuiFormRow>
            {/* )} */}
          </EuiDescribedFormGroup>
          {CustomSettingsComponent}
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
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              aria-label={`cancel-${currentTitle ?? selectedFieldName}`}
              data-test-subj="control-editor-cancel"
              iconType="cross"
              onClick={() => {
                onCancel(getCurrentState());
              }}
            >
              {i18n.translate('controls.controlGroup.manageControl.cancelTitle', {
                defaultMessage: 'Cancel',
              })}
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
                onSave(getCurrentState());
              }}
            >
              {i18n.translate('controls.controlGroup.manageControl.saveChangesTitle', {
                defaultMessage: 'Save and close',
              })}
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </>
  );
};
