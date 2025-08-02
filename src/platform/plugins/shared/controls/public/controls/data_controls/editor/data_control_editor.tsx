/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import useAsync from 'react-use/lib/useAsync';

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
  EuiKeyPadMenu,
  EuiKeyPadMenuItem,
  EuiSkeletonRectangle,
  EuiSpacer,
  EuiSwitch,
  EuiTitle,
  EuiToolTip,
  EuiText,
} from '@elastic/eui';

import { asyncMap } from '@kbn/std';
import { css } from '@emotion/react';
import { useStateFromPublishingSubject } from '@kbn/presentation-publishing';
import {
  DEFAULT_CONTROL_GROW,
  DEFAULT_CONTROL_WIDTH,
  ControlValuesSource,
  ControlOutputOption,
  DEFAULT_CONTROL_VALUES_SOURCE,
  DEFAULT_CONTROL_OUTPUT,
  OPTIONS_LIST_CONTROL,
  RANGE_SLIDER_CONTROL,
} from '@kbn/controls-constants';
import type { ControlWidth } from '@kbn/controls-schemas';
import { type DefaultDataControlState } from '../../../../common';
import { dataViewsService } from '../../../services/kibana_services';
import { getAllControlTypes, getControlFactory } from '../../../control_factory_registry';
import type { ControlGroupApi } from '../../../control_group/types';
import { DataControlEditorStrings } from '../data_control_constants';
import { getDataControlFieldRegistry } from './data_control_editor_utils';
import {
  CONTROL_WIDTH_OPTIONS,
  DEFAULT_ESQL_VARIABLE_NAME,
  EditorComponentStatus,
} from './editor_constants';
import {
  isDataControlFactory,
  type DataControlFactory,
  type DataControlFieldRegistry,
} from '../types';
import { ControlFactory } from '../../types';
import { confirmDeleteControl } from '../../../common';
import { DataViewAndFieldContextProvider } from './data_view_and_field_picker';
import { SelectValuesSource } from './values_source/select_values_source';
import { SelectOutput } from './output/select_output';
import { validateESQLVariableString } from './output/validate_esql_variable_string';

export interface ControlEditorProps<
  State extends DefaultDataControlState = DefaultDataControlState
> {
  initialState: Partial<State>;
  controlType?: string;
  controlId?: string;
  initialDefaultPanelTitle?: string;
  controlGroupApi: ControlGroupApi; // controls must always have a parent API
  onCancel: (newState: Partial<State>) => void;
  onSave: (newState: Partial<State>, type: string) => void;
  ariaLabelledBy: string;
  showESQLOnly?: boolean;
}

const CompatibleControlTypesComponent = ({
  fieldRegistry,
  selectedFieldName,
  selectedControlType,
  setSelectedControlType,
  isESQLOutputMode,
  isStaticValuesSource,
}: {
  fieldRegistry?: DataControlFieldRegistry;
  selectedFieldName?: string;
  selectedControlType?: string;
  setSelectedControlType: (type: string) => void;
  isESQLOutputMode: boolean;
  isStaticValuesSource: boolean;
}) => {
  const [dataControlFactories, setDataControlFactories] = useState<
    DataControlFactory[] | undefined
  >(undefined);

  useEffect(() => {
    let cancelled = false;

    asyncMap<string, ControlFactory>(getAllControlTypes(), async (controlType) =>
      getControlFactory(controlType)
    )
      .then((controlFactories) => {
        if (!cancelled) {
          setDataControlFactories(
            controlFactories
              .filter((factory) => isDataControlFactory(factory))
              .sort(
                (
                  { order: orderA = 0, getDisplayName: getDisplayNameA },
                  { order: orderB = 0, getDisplayName: getDisplayNameB }
                ) => {
                  const orderComparison = orderB - orderA; // sort descending by order
                  return orderComparison === 0
                    ? getDisplayNameA().localeCompare(getDisplayNameB()) // if equal order, compare display names
                    : orderComparison;
                }
              ) as unknown as DataControlFactory[]
          );
        }
      })
      .catch(() => {
        if (!cancelled) setDataControlFactories([]);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <EuiSkeletonRectangle
      isLoading={dataControlFactories === undefined}
      width="100px"
      height="100px"
    >
      <EuiKeyPadMenu data-test-subj={`controlTypeMenu`} aria-label={'type'}>
        {(dataControlFactories ?? []).map((factory) => {
          const disabled =
            isStaticValuesSource || isESQLOutputMode
              ? factory.type !== OPTIONS_LIST_CONTROL
              : fieldRegistry && selectedFieldName
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
              key={`disabled__${factory.type}`}
              content={DataControlEditorStrings.manageControl.dataSource.getControlTypeErrorMessage(
                {
                  fieldSelected: Boolean(selectedFieldName),
                  controlType: factory.type,
                  isESQLOutputMode,
                  isStaticValuesSource,
                }
              )}
            >
              {keyPadMenuItem}
            </EuiToolTip>
          ) : (
            keyPadMenuItem
          );
        })}
      </EuiKeyPadMenu>
    </EuiSkeletonRectangle>
  );
};

export const DataControlEditor = <State extends DefaultDataControlState = DefaultDataControlState>({
  initialState,
  controlId,
  controlType,
  initialDefaultPanelTitle,
  onSave,
  onCancel,
  controlGroupApi,
  ariaLabelledBy,
  showESQLOnly = false,
}: ControlEditorProps<State>) => {
  const isEdit = useMemo(() => !!controlId, [controlId]); // if no ID, then we are creating a new control

  const [editorState, setEditorState] = useState<Partial<State>>(initialState);
  const [defaultPanelTitle, setDefaultPanelTitle] = useState<string>(
    initialDefaultPanelTitle ?? initialState.fieldName ?? ''
  );
  const [panelTitle, setPanelTitle] = useState<string>(initialState.title ?? defaultPanelTitle);
  const [selectedControlType, setSelectedControlType] = useState<string | undefined>(controlType);
  const [controlOptionsValid, setControlOptionsValid] = useState<boolean>(true);

  const editorConfig = useMemo(() => controlGroupApi.getEditorConfig(), [controlGroupApi]);
  const existingESQLVariables = useStateFromPublishingSubject(controlGroupApi.esqlVariables$);

  const isDSLValuesSource = useMemo(
    () => (editorState.valuesSource ?? DEFAULT_CONTROL_VALUES_SOURCE) === ControlValuesSource.DSL,
    [editorState.valuesSource]
  );
  const isESQLValuesSource = useMemo(
    () => editorState.valuesSource === ControlValuesSource.ESQL,
    [editorState.valuesSource]
  );
  const isStaticValuesSource = useMemo(
    () => editorState.valuesSource === ControlValuesSource.STATIC,
    [editorState.valuesSource]
  );

  const isESQLOutputMode = useMemo(
    () => editorState.output === ControlOutputOption.ESQL,
    [editorState.output]
  );

  const [esqlQueryValidation, setESQLQueryValidation] = useState<EditorComponentStatus>(
    isEdit && isESQLValuesSource ? EditorComponentStatus.COMPLETE : EditorComponentStatus.INCOMPLETE
  );

  const [hasTouchedValuesSource, setHasTouchedValuesSource] = useState(isEdit);

  const updateEditorState = useCallback(
    (update: Partial<State>) => setEditorState((state) => ({ ...state, ...update })),
    []
  );

  useEffect(() => {
    // Set the default input mode to ES|QL for showESQLOnly editors
    if (isDSLValuesSource && showESQLOnly) {
      setEditorState((state) => ({ ...state, valuesSource: ControlValuesSource.ESQL }));
    }
    if (!isESQLOutputMode && showESQLOnly) {
      setEditorState((state) => ({ ...state, output: ControlOutputOption.ESQL }));
    }

    // Set the default control label to either the selected field name or entered ES|QL variable name
    switch (editorState.output) {
      case ControlOutputOption.DSL:
        if (defaultPanelTitle !== (editorState.fieldName ?? '')) {
          setDefaultPanelTitle(editorState.fieldName ?? '');
        }
        break;
      case ControlOutputOption.ESQL:
        if (defaultPanelTitle !== (editorState.esqlVariableString ?? DEFAULT_ESQL_VARIABLE_NAME)) {
          setDefaultPanelTitle(editorState.esqlVariableString ?? DEFAULT_ESQL_VARIABLE_NAME);
        }
        break;
    }

    //  When creating a new control, and the user has not yet touched the values source
    if (!hasTouchedValuesSource) {
      // Sync up the output mode with the values source
      switch (editorState.output) {
        case ControlOutputOption.DSL:
          if (!showESQLOnly && editorState.valuesSource !== ControlValuesSource.DSL) {
            setEditorState((state) => ({ ...state, valuesSource: ControlValuesSource.DSL }));
          }
          break;
        case ControlOutputOption.ESQL:
          // If the user enters ?? in the ES|QL variable, set the values source to static
          if (editorState.esqlVariableString?.startsWith('??') && !isStaticValuesSource) {
            setEditorState((state) => ({ ...state, valuesSource: ControlValuesSource.STATIC }));
          } else if (isDSLValuesSource) {
            setEditorState((state) => ({ ...state, valuesSource: ControlValuesSource.ESQL }));
          }
          break;
      }
    }
  }, [
    hasTouchedValuesSource,
    editorState,
    defaultPanelTitle,
    isDSLValuesSource,
    showESQLOnly,
    isESQLOutputMode,
    isStaticValuesSource,
  ]);

  const {
    loading: dataViewListLoading,
    value: dataViewListItems = [],
    error: dataViewListError,
  } = useAsync(async () => {
    return dataViewsService.getIdsWithTitle();
  });

  const {
    loading: dataViewLoading,
    value: { selectedDataView, fieldRegistry } = {
      selectedDataView: undefined,
      fieldRegistry: undefined,
    },
    error: fieldListError,
  } = useAsync(async () => {
    if (!editorState.dataViewId) {
      return;
    }

    const dataView = await dataViewsService.get(editorState.dataViewId);
    const registry = await getDataControlFieldRegistry(dataView);
    return {
      selectedDataView: dataView,
      fieldRegistry: registry,
    };
  }, [editorState.dataViewId]);

  const [controlFactory, setControlFactory] = useState<DataControlFactory | undefined>(undefined);
  useEffect(() => {
    if (!selectedControlType) {
      setControlFactory(undefined);
      return;
    }

    let cancelled = false;
    getControlFactory(selectedControlType)
      .then((nextControlFactory) => {
        if (!cancelled) {
          setControlFactory(nextControlFactory as unknown as DataControlFactory);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setControlFactory(undefined);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [selectedControlType]);

  useEffect(() => {
    const newFieldName = editorState.fieldName;

    // TODO remove this check when range sliders can output ES|QL variables
    if (isESQLOutputMode) {
      setSelectedControlType(OPTIONS_LIST_CONTROL);
    } else if (newFieldName && fieldRegistry) {
      /**
       * make sure that the new field is compatible with the selected control type and, if it's not,
       * reset the selected control type to the **first** compatible control type
       */
      const newCompatibleControlTypes = fieldRegistry[newFieldName]?.compatibleControlTypes ?? [];
      if (selectedControlType && !newCompatibleControlTypes.includes(selectedControlType)) {
        setSelectedControlType(newCompatibleControlTypes[0]);
      } else {
        /**
         * Set number fields to range sliders by default, other controls to the first compatible type
         */
        if (
          fieldRegistry[newFieldName].field.type === 'number' &&
          newCompatibleControlTypes.includes(RANGE_SLIDER_CONTROL)
        ) {
          setSelectedControlType(RANGE_SLIDER_CONTROL);
        } else {
          setSelectedControlType(newCompatibleControlTypes[0]);
        }
      }
    }
    // Intentionally only run this effect when the field name or the output mode changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editorState.fieldName, isESQLOutputMode]);

  const CustomSettingsComponent = useMemo(() => {
    if (!controlFactory || !fieldRegistry) return;
    const CustomSettings = controlFactory.CustomOptionsComponent;

    if (!CustomSettings) return;

    return (
      <div data-test-subj="control-editor-custom-settings">
        <EuiSpacer size="m" />
        <CustomSettings
          initialState={initialState}
          field={editorState.fieldName ? fieldRegistry[editorState.fieldName].field : undefined}
          updateState={(newState) => setEditorState((state) => ({ ...state, ...newState }))}
          setControlEditorValid={setControlOptionsValid}
          controlGroupApi={controlGroupApi}
          output={editorState.output ?? DEFAULT_CONTROL_OUTPUT}
          valuesSource={editorState.valuesSource ?? DEFAULT_CONTROL_VALUES_SOURCE}
        />
      </div>
    );
  }, [fieldRegistry, controlFactory, initialState, editorState, controlGroupApi]);

  const [esqlVariableValidation, esqlVariableError] = useMemo(
    () =>
      validateESQLVariableString(
        editorState.esqlVariableString,
        initialState.esqlVariableString,
        existingESQLVariables,
        isStaticValuesSource
      ),
    [
      editorState.esqlVariableString,
      initialState.esqlVariableString,
      isStaticValuesSource,
      existingESQLVariables,
    ]
  );

  const valuesSourceStatus = useMemo(() => {
    if (isDSLValuesSource) {
      const hasFieldName = !!editorState.fieldName;
      const hasSelectedDataView = !!selectedDataView;
      if (hasFieldName && hasSelectedDataView) return EditorComponentStatus.COMPLETE;
    } else if (isESQLValuesSource) {
      return esqlQueryValidation;
    } else if (isStaticValuesSource) {
      if (
        editorState.staticValues?.length &&
        editorState.staticValues?.some(({ text }) => Boolean(text))
      )
        return EditorComponentStatus.COMPLETE;
    }
    return EditorComponentStatus.INCOMPLETE;
  }, [
    esqlQueryValidation,
    editorState.fieldName,
    editorState.staticValues,
    isDSLValuesSource,
    isESQLValuesSource,
    isStaticValuesSource,
    selectedDataView,
  ]);

  const outputStatus = useMemo(() => {
    if (isESQLOutputMode) {
      return esqlVariableValidation;
    } else {
      return editorState.fieldName
        ? EditorComponentStatus.COMPLETE
        : EditorComponentStatus.INCOMPLETE;
    }
  }, [isESQLOutputMode, editorState.fieldName, esqlVariableValidation]);

  const controlConfigStatus = useMemo(() => {
    if (!selectedControlType) return EditorComponentStatus.INCOMPLETE;
    if (!controlOptionsValid) return EditorComponentStatus.ERROR;

    // For ES|QL output mode, selectedControlType is always true, so to reduce visual noise,
    // prevent the green checkbox from showing up until the rest of the form is complete
    // TODO remove this when range sliders can output ES|QL variables
    if (isESQLOutputMode && outputStatus !== EditorComponentStatus.COMPLETE)
      return EditorComponentStatus.INCOMPLETE;

    return EditorComponentStatus.COMPLETE;
  }, [isESQLOutputMode, outputStatus, selectedControlType, controlOptionsValid]);

  return (
    <DataViewAndFieldContextProvider
      value={{
        dataViewListItems,
        dataViewListLoading,
        dataViewLoading,
        dataViewListError,
        selectedDataView,
        fieldListError,
        fieldRegistry,
      }}
    >
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="s">
          <h2 id={ariaLabelledBy}>
            {!isEdit
              ? DataControlEditorStrings.manageControl.getFlyoutCreateTitle(showESQLOnly)
              : DataControlEditorStrings.manageControl.getFlyoutEditTitle()}
          </h2>
        </EuiTitle>
      </EuiFlyoutHeader>
      <EuiFlyoutBody
        data-test-subj="control-editor-flyout"
        css={
          /**
           * Workaround for https://github.com/elastic/eui/issues/8883
           * Tracked in https://github.com/elastic/kibana/issues/228654
           */
          css`
            .euiFlyoutBody__overflow {
              transform: initial;
              -webkit-mask-image: none;
              mask-image: none;
              padding-left: inherit;
              margin-left: inherit;
            }
          `
        }
      >
        <EuiForm fullWidth>
          <SelectOutput
            outputMode={editorState.output ?? DEFAULT_CONTROL_OUTPUT}
            valuesSource={editorState.valuesSource ?? DEFAULT_CONTROL_VALUES_SOURCE}
            editorState={editorState}
            editorConfig={editorConfig}
            updateEditorState={updateEditorState}
            setDefaultPanelTitle={setDefaultPanelTitle}
            setSelectedControlType={setSelectedControlType}
            setControlOptionsValid={setControlOptionsValid}
            variableStringError={esqlVariableError}
            showESQLOnly={showESQLOnly}
          />
          <SelectValuesSource
            valuesSource={editorState.valuesSource ?? DEFAULT_CONTROL_VALUES_SOURCE}
            editorState={editorState}
            editorConfig={editorConfig}
            selectedControlType={selectedControlType}
            updateEditorState={updateEditorState}
            setDefaultPanelTitle={setDefaultPanelTitle}
            setSelectedControlType={setSelectedControlType}
            setControlOptionsValid={setControlOptionsValid}
            setESQLQueryValidation={setESQLQueryValidation}
            setHasTouchedValuesSource={setHasTouchedValuesSource}
            isEdit={isEdit}
            showESQLOnly={showESQLOnly}
          />
          <>
            {/* TODO remove !showESQLOnly when range siders can output ES|QL variables */}
            {!showESQLOnly && (
              <EuiFormRow
                label={DataControlEditorStrings.manageControl.dataSource.getControlTypeTitle()}
              >
                {/* wrapping in `div` so that focus gets passed properly to the form row */}
                <div>
                  <CompatibleControlTypesComponent
                    fieldRegistry={fieldRegistry}
                    selectedFieldName={editorState.fieldName}
                    selectedControlType={selectedControlType}
                    setSelectedControlType={setSelectedControlType}
                    isESQLOutputMode={isESQLOutputMode}
                    isStaticValuesSource={isStaticValuesSource}
                  />
                </div>
              </EuiFormRow>
            )}
            <EuiFormRow
              label={DataControlEditorStrings.manageControl.displaySettings.getTitleInputTitle()}
              labelAppend={
                <EuiText size="xs" color="subdued">
                  {DataControlEditorStrings.manageControl.displaySettings.getTitleInputOptionalText()}
                </EuiText>
              }
            >
              <EuiFieldText
                data-test-subj="control-editor-title-input"
                placeholder={defaultPanelTitle}
                value={panelTitle}
                compressed
                onChange={(e) => {
                  setPanelTitle(e.target.value ?? '');
                  setEditorState((state) => ({
                    ...state,
                    title: e.target.value === '' ? undefined : e.target.value,
                  }));
                }}
              />
            </EuiFormRow>
            {!editorConfig?.hideWidthSettings && (
              <EuiFormRow
                data-test-subj="control-editor-width-settings"
                label={DataControlEditorStrings.manageControl.displaySettings.getWidthInputTitle()}
              >
                <div>
                  <EuiButtonGroup
                    buttonSize="compressed"
                    legend={DataControlEditorStrings.management.controlWidth.getWidthSwitchLegend()}
                    options={CONTROL_WIDTH_OPTIONS}
                    idSelected={editorState.width ?? DEFAULT_CONTROL_WIDTH}
                    onChange={(newWidth: string) =>
                      setEditorState((state) => ({
                        ...state,
                        width: newWidth as ControlWidth,
                      }))
                    }
                  />
                  <EuiSpacer size="s" />
                  <EuiSwitch
                    compressed
                    label={DataControlEditorStrings.manageControl.displaySettings.getGrowSwitchTitle()}
                    color="primary"
                    checked={editorState.grow ?? DEFAULT_CONTROL_GROW}
                    onChange={() =>
                      setEditorState((state) => ({ ...state, grow: !editorState.grow }))
                    }
                    data-test-subj="control-editor-grow-switch"
                  />
                </div>
              </EuiFormRow>
            )}
            {!editorConfig?.hideAdditionalSettings && CustomSettingsComponent}
          </>
        </EuiForm>
      </EuiFlyoutBody>
      <EuiFlyoutFooter>
        <EuiFlexGroup responsive={false} justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              aria-label={`cancel-${editorState.title ?? editorState.fieldName}`}
              data-test-subj="control-editor-cancel"
              onClick={() => {
                onCancel(editorState);
              }}
            >
              {DataControlEditorStrings.manageControl.getCancelTitle()}
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiFlexGroup responsive={false} justifyContent="flexEnd" gutterSize="s">
              {controlId && (
                <EuiButton
                  aria-label={`delete-${editorState.title ?? editorState.fieldName}`}
                  iconType="trash"
                  color="danger"
                  onClick={() => {
                    confirmDeleteControl().then((confirmed) => {
                      if (confirmed) {
                        onCancel(initialState); // don't want to show "lost changes" warning
                        controlGroupApi.removePanel(controlId!);
                      }
                    });
                  }}
                >
                  {DataControlEditorStrings.manageControl.getDeleteButtonTitle()}
                </EuiButton>
              )}
              <EuiButton
                aria-label={`save-${editorState.title ?? defaultPanelTitle}`}
                data-test-subj="control-editor-save"
                fill
                color="primary"
                disabled={
                  !(
                    valuesSourceStatus === EditorComponentStatus.COMPLETE &&
                    outputStatus === EditorComponentStatus.COMPLETE &&
                    controlConfigStatus === EditorComponentStatus.COMPLETE
                  )
                }
                onClick={() => {
                  const state = { ...editorState, title: editorState.title ?? defaultPanelTitle };
                  if (!isDSLValuesSource && isESQLOutputMode) {
                    delete state.fieldName;
                    delete state.dataViewId;
                  }
                  if (!isESQLOutputMode) {
                    delete state.esqlVariableString;
                  }
                  if (!isESQLValuesSource) {
                    delete state.esqlQuery;
                  }
                  if (!isStaticValuesSource) {
                    delete state.staticValues;
                  } else {
                    // Do not save empty static values
                    state.staticValues = state.staticValues!.filter(({ text }) => !!text);
                  }
                  onSave(state, selectedControlType!);
                }}
              >
                {DataControlEditorStrings.manageControl.getSaveChangesTitle()}
              </EuiButton>
            </EuiFlexGroup>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </DataViewAndFieldContextProvider>
  );
};
