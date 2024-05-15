/* * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useEffect, useRef, useState } from 'react';
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
  EuiSpacer,
  EuiSwitch,
  EuiTitle,
} from '@elastic/eui';
import { DataViewField } from '@kbn/data-views-plugin/common';
import { useBatchedOptionalPublishingSubjects } from '@kbn/presentation-publishing';
import {
  LazyDataViewPicker,
  LazyFieldPicker,
  withSuspense,
} from '@kbn/presentation-util-plugin/public';

// import { getDataControlFieldRegistry } from '@kbn/controls-plugin/public/control_group/editor/data_control_editor_tools';
import { CoreStart } from '@kbn/core/public';
import { DataViewsPublicPluginStart } from '@kbn/data-views-plugin/public';
import { i18n } from '@kbn/i18n';
import { ControlGroupApi } from '../control_group/types';
import { DataControlStateManager } from './initialize_data_control';
import { DataEditorState } from './types';
import { getDataControlFieldRegistry } from './data_control_editor_utils';
import { ControlWidth } from '@kbn/controls-plugin/common';

export interface ControlEditorProps {
  isCreate: boolean;
  // api?: DefaultControlApi; // if defined, we are editing an existing control; otherwise, we are creating a new control
  parentApi: ControlGroupApi; // controls must always have a parent API, so pass it in
  stateManager: DataControlStateManager;
  closeFlyout: () => void;
  onSave: (state: DataEditorState, type?: string) => void;
  // onCancel: () => void;
  services: {
    core: CoreStart;
    dataViews: DataViewsPublicPluginStart;
  };
}

const FieldPicker = withSuspense(LazyFieldPicker, null);
const DataViewPicker = withSuspense(LazyDataViewPicker, null);

const CONTROL_WIDTH_OPTIONS = [
  {
    id: `small`,
    'data-test-subj': 'control-editor-width-small',
    label: i18n.translate('controls.controlGroup.management.layout.small', {
      defaultMessage: 'Small',
    }),
  },
  {
    id: `medium`,
    'data-test-subj': 'control-editor-width-medium',
    label: i18n.translate('controls.controlGroup.management.layout.medium', {
      defaultMessage: 'Medium',
    }),
  },
  {
    id: `large`,
    'data-test-subj': 'control-editor-width-large',
    label: i18n.translate('controls.controlGroup.management.layout.large', {
      defaultMessage: 'Large',
    }),
  },
];

// const getControlTypeErrorMessage = ({
//   fieldSelected,
//   controlType,
// }: {
//   fieldSelected?: boolean;
//   controlType?: string;
// }) => {
//   if (!fieldSelected) {
//     return i18n.translate(
//       'controls.controlGroup.manageControl.dataSource.controlTypErrorMessage.noField',
//       {
//         defaultMessage: 'Select a field first.',
//       }
//     );
//   }

//   switch (controlType) {
//     /**
//      * Note that options list controls are currently compatible with every field type; so, there is no
//      * need to have a special error message for these.
//      */
//     case RANGE_SLIDER_CONTROL: {
//       return i18n.translate(
//         'controls.controlGroup.manageControl.dataSource.controlTypeErrorMessage.rangeSlider',
//         {
//           defaultMessage: 'Range sliders are only compatible with number fields.',
//         }
//       );
//     }
//     default: {
//       /** This shouldn't ever happen - but, adding just in case as a fallback. */
//       return i18n.translate(
//         'controls.controlGroup.manageControl.dataSource.controlTypeErrorMessage.default',
//         {
//           defaultMessage: 'Select a compatible control type.',
//         }
//       );
//     }
//   }
// };

export const DataControlEditor = ({
  parentApi: controlGroup,
  stateManager,
  closeFlyout,
  onSave,
  /** TODO: These should not be props */
  services: { dataViews: dataViewService, core },
}: ControlEditorProps) => {
  // const {
  //   dataViews: { getIdsWithTitle, get },
  //   // controls: { getControlFactory, getControlTypes },
  //   overlays: { openConfirm },
  // } = pluginServices.getServices();

  const initialState = useRef(
    Object.keys(stateManager).reduce((prev, key) => {
      return { ...prev, [key]: stateManager[key as keyof StateManager].getValue() };
    }, {})
  );

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
  // const [selectedSettings, setSelectedSettings] = useState(stateManager.settings.getValue());

  // const editorConfig = controlGroup.select((state) => state.componentState.editorConfig);
  const [currentTitle, setCurrentTitle] = useState<string | undefined>(
    stateManager.title.getValue()
  );
  // const [selectedControlType, setSelectedControlType] = useState<string | undefined>(api?.type);

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

  // const CompatibleControlTypesComponent = useMemo(() => {
  //   // TODO - get control types
  //   const allDataControlTypes = getAllControlTypes().filter((type) => type !== TIME_SLIDER_CONTROL);
  //   return (
  //     <EuiKeyPadMenu data-test-subj={`controlTypeMenu`} aria-label={'type'}>
  //       {allDataControlTypes.map((controlType: string) => {
  //         const factory = getControlFactory(controlType);
  //         const disabled =
  //           fieldRegistry && selectedFieldName
  //             ? !fieldRegistry[selectedFieldName]?.compatibleControlTypes.includes(controlType)
  //             : true;
  //         const keyPadMenuItem = (
  //           <EuiKeyPadMenuItem
  //             key={controlType}
  //             id={`create__${controlType}`}
  //             aria-label={factory.getDisplayName()}
  //             data-test-subj={`create__${controlType}`}
  //             isSelected={controlType === selectedControlType}
  //             disabled={disabled}
  //             onClick={() => setSelectedControlType(controlType)}
  //             label={factory.getDisplayName()}
  //           >
  //             <EuiIcon type={factory.getIconType()} size="l" />
  //           </EuiKeyPadMenuItem>
  //         );

  //         return disabled ? (
  //           <EuiToolTip
  //             key={`disabled__${controlType}`}
  //             content={getControlTypeErrorMessage({
  //               fieldSelected: Boolean(selectedFieldName),
  //               controlType,
  //             })}
  //           >
  //             {keyPadMenuItem}
  //           </EuiToolTip>
  //         ) : (
  //           keyPadMenuItem
  //         );
  //       })}
  //     </EuiKeyPadMenu>
  //   );
  // }, [selectedFieldName, fieldRegistry, getControlFactory, getControlTypes, selectedControlType]);

  // const onCancel = useCallback(() => {
  //   const currentState = Object.keys(stateManager).reduce((prev, key) => {
  //     return { ...prev, [key]: stateManager[key as keyof StateManager].getValue() };
  //   }, {});
  //   if (deepEqual(initialState.current, currentState)) {
  //     closeFlyout();
  //     return;
  //   }
  //   openConfirm(
  //     i18n.translate('controls.controlGroup.management.discard.sub', {
  //       defaultMessage: `Changes that you've made to this control will be discarded, are you sure you want to continue?`,
  //     }),
  //     {
  //       confirmButtonText: i18n.translate('controls.controlGroup.management.discard.confirm', {
  //         defaultMessage: 'Discard changes',
  //       }),
  //       cancelButtonText: i18n.translate('controls.controlGroup.management.discard.cancel', {
  //         defaultMessage: 'Cancel',
  //       }),
  //       title: i18n.translate('controls.controlGroup.management.discard.title', {
  //         defaultMessage: 'Discard changes?',
  //       }),
  //       buttonColor: 'danger',
  //     }
  //   ).then((confirmed) => {
  //     if (confirmed) {
  //       closeFlyout();
  //     }
  //   });
  // }, [closeFlyout, openConfirm, stateManager]);

  // const onSave = useCallback(() => {
  //   if (!selectedControlType) return;

  //   console.log('on save');
  //   const currentState = Object.keys(stateManager).reduce((prev, key) => {
  //     return { ...prev, [key]: stateManager[key as keyof StateManager].getValue() };
  //   }, {} as PanelPackage);

  //   if (!api) {
  //     // if no API was provided, this is a new control - so, add it to the control group
  //     controlGroup.addNewPanel(
  //       { panelType: selectedControlType, initialState: currentState },
  //       false
  //     );
  //     closeFlyout();
  //     return;
  //   }

  //   if (selectedControlType !== api.type) {
  //     controlGroup.replacePanel(api.uuid, {
  //       panelType: selectedControlType,
  //       initialState: currentState,
  //     });
  //   } else {
  //     console.log('UPDATE!!!');
  //   }
  //   // Object.keys(stateManager).map((key) => {
  //   //   api.

  //   closeFlyout();
  // }, [closeFlyout, api, controlGroup, selectedControlType, stateManager]);

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
            Test
            {/* {!Boolean(api)
              ? ControlGroupStrings.manageControl.getFlyoutCreateTitle()
              : ControlGroupStrings.manageControl.getFlyoutEditTitle()} */}
          </h2>
        </EuiTitle>
      </EuiFlyoutHeader>
      <EuiFlyoutBody data-test-subj="control-editor-flyout">
        <EuiForm fullWidth>
          <EuiDescribedFormGroup
            ratio="third"
            title={<h2>test</h2>}
            description={'test'}
            // title={<h2>{ControlGroupStrings.manageControl.dataSource.getFormGroupTitle()}</h2>}
            // description={ControlGroupStrings.manageControl.dataSource.getFormGroupDescription()}
          >
            {/* {!editorConfig?.hideDataViewSelector && ( */}
            <EuiFormRow
              label="test"
              // label={ControlGroupStrings.manageControl.dataSource.getDataViewTitle()}
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
              label="test"
              // label={ControlGroupStrings.manageControl.dataSource.getFieldTitle()}
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
            {/* <EuiFormRow label={ControlGroupStrings.manageControl.dataSource.getControlTypeTitle()}>
              {CompatibleControlTypesComponent}
            </EuiFormRow> */}
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
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              aria-label={`cancel-${currentTitle ?? selectedFieldName}`}
              data-test-subj="control-editor-cancel"
              iconType="cross"
              onClick={() => {
                // onCancel();
                console.log('on cancel');
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
                onSave({
                  dataViewId: selectedDataViewId,
                  fieldName: selectedFieldName,
                  title: currentTitle === selectedFieldDisplayName ? undefined : currentTitle,
                  grow: selectedGrow,
                  width: selectedWidth,
                });
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
