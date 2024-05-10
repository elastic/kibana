/* * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import deepEqual from 'react-fast-compare';
import useAsync from 'react-use/lib/useAsync';
import { BehaviorSubject } from 'rxjs';

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
  useBatchedOptionalPublishingSubjects,
  useBatchedPublishingSubjects,
} from '@kbn/presentation-publishing';
import {
  LazyDataViewPicker,
  LazyFieldPicker,
  withSuspense,
} from '@kbn/presentation-util-plugin/public';

import { RANGE_SLIDER_CONTROL, TIME_SLIDER_CONTROL } from '@kbn/controls-plugin/common';
import { OverlayStart } from '@kbn/core-overlays-browser';
import { DataViewsPublicPluginStart } from '@kbn/data-views-plugin/public';
import { i18n } from '@kbn/i18n';
import { PanelPackage } from '@kbn/presentation-containers';
import { DefaultControlApi } from '@kbn/controls-plugin/public/types';
import { ControlGroupApi } from '@kbn/controls-plugin/public/control_group/types';
import { getAllControlTypes, getControlFactory } from '../control_factory_registry';
import { getDataControlFieldRegistry } from '@kbn/controls-plugin/public/control_group/editor/data_control_editor_tools';

interface StateManager {
  dataViewId$: BehaviorSubject<string | undefined>;
  fieldName$: BehaviorSubject<string | undefined>;
  grow: BehaviorSubject<boolean | undefined>;
  width: BehaviorSubject<ControlWidth | undefined>;
  settings: BehaviorSubject<object | undefined>;
}

export interface ControlEditorProps {
  api?: DefaultControlApi; // if defined, we are editing an existing control; otherwise, we are creating a new control
  parentApi: ControlGroupApi; // controls must always have a parent API, so pass it in
  stateManager: StateManager;
  closeFlyout: () => void;
  // onSave: (type?: string) => void;
  // onCancel: () => void;
  services: {
    overlays: OverlayStart;
    dataViews: DataViewsPublicPluginStart;
  };
}

const FieldPicker = withSuspense(LazyFieldPicker, null);
const DataViewPicker = withSuspense(LazyDataViewPicker, null);

const getControlTypeErrorMessage = ({
  fieldSelected,
  controlType,
}: {
  fieldSelected?: boolean;
  controlType?: string;
}) => {
  if (!fieldSelected) {
    return i18n.translate(
      'controls.controlGroup.manageControl.dataSource.controlTypErrorMessage.noField',
      {
        defaultMessage: 'Select a field first.',
      }
    );
  }

  switch (controlType) {
    /**
     * Note that options list controls are currently compatible with every field type; so, there is no
     * need to have a special error message for these.
     */
    case RANGE_SLIDER_CONTROL: {
      return i18n.translate(
        'controls.controlGroup.manageControl.dataSource.controlTypeErrorMessage.rangeSlider',
        {
          defaultMessage: 'Range sliders are only compatible with number fields.',
        }
      );
    }
    default: {
      /** This shouldn't ever happen - but, adding just in case as a fallback. */
      return i18n.translate(
        'controls.controlGroup.manageControl.dataSource.controlTypeErrorMessage.default',
        {
          defaultMessage: 'Select a compatible control type.',
        }
      );
    }
  }
};

export const ControlEditor = ({
  parentApi: controlGroup,
  api,
  stateManager,
  closeFlyout,
  /** TODO: These should not be props */
  services: {
    dataViews: dataViewService,
    overlays: { openConfirm },
  },
}: // onSave,
// onCancel,
ControlEditorProps) => {
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

  const [panelTitle, defaultPanelTitle] = useBatchedOptionalPublishingSubjects(
    api?.panelTitle,
    api?.defaultPanelTitle
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
      Boolean(selectedFieldName) && Boolean(selectedDataView) && Boolean(selectedControlType)
    );
  }, [selectedFieldName, setControlEditorValid, selectedDataView, selectedControlType]);

  const CompatibleControlTypesComponent = useMemo(() => {
    // TODO - get control types
    const allDataControlTypes = getAllControlTypes().filter((type) => type !== TIME_SLIDER_CONTROL);
    return (
      <EuiKeyPadMenu data-test-subj={`controlTypeMenu`} aria-label={'type'}>
        {allDataControlTypes.map((controlType: string) => {
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
  }, [selectedFieldName, fieldRegistry, getControlFactory, getControlTypes, selectedControlType]);

  const onCancel = useCallback(() => {
    const currentState = Object.keys(stateManager).reduce((prev, key) => {
      return { ...prev, [key]: stateManager[key as keyof StateManager].getValue() };
    }, {});
    if (deepEqual(initialState.current, currentState)) {
      closeFlyout();
      return;
    }
    openConfirm(
      i18n.translate('controls.controlGroup.management.discard.sub', {
        defaultMessage: `Changes that you've made to this control will be discarded, are you sure you want to continue?`,
      }),
      {
        confirmButtonText: i18n.translate('controls.controlGroup.management.discard.confirm', {
          defaultMessage: 'Discard changes',
        }),
        cancelButtonText: i18n.translate('controls.controlGroup.management.discard.cancel', {
          defaultMessage: 'Cancel',
        }),
        title: i18n.translate('controls.controlGroup.management.discard.title', {
          defaultMessage: 'Discard changes?',
        }),
        buttonColor: 'danger',
      }
    ).then((confirmed) => {
      if (confirmed) {
        closeFlyout();
      }
    });
  }, [closeFlyout, openConfirm, stateManager]);

  const onSave = useCallback(() => {
    if (!selectedControlType) return;

    console.log('on save');
    const currentState = Object.keys(stateManager).reduce((prev, key) => {
      return { ...prev, [key]: stateManager[key as keyof StateManager].getValue() };
    }, {} as PanelPackage);

    if (!api) {
      // if no API was provided, this is a new control - so, add it to the control group
      controlGroup.addNewPanel(
        { panelType: selectedControlType, initialState: currentState },
        false
      );
      closeFlyout();
      return;
    }

    if (selectedControlType !== api.type) {
      controlGroup.replacePanel(api.uuid, {
        panelType: selectedControlType,
        initialState: currentState,
      });
    } else {
      console.log('UPDATE!!!');
    }
    // Object.keys(stateManager).map((key) => {
    //   api.

    closeFlyout();
  }, [closeFlyout, api, controlGroup, selectedControlType, stateManager]);

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
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              aria-label={`cancel-${panelTitle ?? defaultPanelTitle}`}
              data-test-subj="control-editor-cancel"
              iconType="cross"
              onClick={() => {
                onCancel();
              }}
            >
              {ControlGroupStrings.manageControl.getCancelTitle()}
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton
              aria-label={`save-${panelTitle ?? defaultPanelTitle}`}
              data-test-subj="control-editor-save"
              iconType="check"
              color="primary"
              disabled={!controlEditorValid}
              onClick={() => {
                onSave();
              }}
            >
              {ControlGroupStrings.manageControl.getSaveChangesTitle()}
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </>
  );
};
