/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
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
  EuiSteps,
  EuiText,
  EuiCheckableCard,
  useGeneratedHtmlId,
  EuiPopover,
  EuiPanel,
} from '@elastic/eui';

import { asyncMap } from '@kbn/std';
import { EuiContainedStepProps } from '@elastic/eui/src/components/steps/steps';
import { css } from '@emotion/react';
import {
  DEFAULT_CONTROL_GROW,
  DEFAULT_CONTROL_WIDTH,
  type ControlWidth,
  type DefaultDataControlState,
  ControlInputOption,
  ControlOutputOption,
  DEFAULT_CONTROL_INPUT,
  DEFAULT_CONTROL_OUTPUT,
  OPTIONS_LIST_CONTROL,
} from '../../../../common';
import { dataViewsService } from '../../../services/kibana_services';
import { getAllControlTypes, getControlFactory } from '../../../control_factory_registry';
import type { ControlGroupApi } from '../../../control_group/types';
import { DataControlEditorStrings } from '../data_control_constants';
import { getDataControlFieldRegistry } from './data_control_editor_utils';
import {
  CONTROL_OUTPUT_OPTIONS,
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
import {
  DataViewAndFieldContextProvider,
  DataViewAndFieldPicker,
} from './data_view_and_field_picker';
import { SelectInput } from './input/select_input';

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
}

const CompatibleControlTypesComponent = ({
  fieldRegistry,
  selectedFieldName,
  selectedControlType,
  setSelectedControlType,
  isESQLOutputMode,
  isStaticInputMode,
}: {
  fieldRegistry?: DataControlFieldRegistry;
  selectedFieldName?: string;
  selectedControlType?: string;
  setSelectedControlType: (type: string) => void;
  isESQLOutputMode: boolean;
  isStaticInputMode: boolean;
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
            isStaticInputMode || isESQLOutputMode
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
                  isStaticInputMode,
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

const useStepStatus = (status: EditorComponentStatus, isEdit: boolean) => {
  const hasInitialized = useRef(false);
  const initialStatus = useRef(status);
  if (isEdit && !hasInitialized.current) {
    // In edit mode, render untouched complete steps as a filled in blue circle
    if (status !== initialStatus.current) hasInitialized.current = true;
    return undefined;
  }
  switch (status) {
    case EditorComponentStatus.INCOMPLETE:
      return 'incomplete';
    case EditorComponentStatus.ERROR:
      return 'danger';
    case EditorComponentStatus.COMPLETE:
      return 'complete';
  }
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
}: ControlEditorProps<State>) => {
  const isEdit = useMemo(() => !!controlId, [controlId]); // if no ID, then we are creating a new control

  const [editorState, setEditorState] = useState<Partial<State>>(initialState);
  const [defaultPanelTitle, setDefaultPanelTitle] = useState<string>(
    initialDefaultPanelTitle ?? initialState.fieldName ?? ''
  );
  const [panelTitle, setPanelTitle] = useState<string>(initialState.title ?? defaultPanelTitle);
  const [selectedControlType, setSelectedControlType] = useState<string | undefined>(controlType);
  const [controlOptionsValid, setControlOptionsValid] = useState<boolean>(true);

  const [esqlQueryValidation, setEsqlQueryValidation] = useState<EditorComponentStatus>(
    isEdit ? EditorComponentStatus.COMPLETE : EditorComponentStatus.INCOMPLETE
  );

  const editorConfig = useMemo(() => controlGroupApi.getEditorConfig(), [controlGroupApi]);

  const [isFieldOutputPopoverOpen, setIsFieldOutputPopoverOpen] = useState<boolean>(false);

  const isDSLInputMode = useMemo(
    () => (editorState.input ?? DEFAULT_CONTROL_INPUT) === ControlInputOption.DSL,
    [editorState.input]
  );
  const isESQLInputMode = useMemo(
    () => editorState.input === ControlInputOption.ESQL,
    [editorState.input]
  );
  const isStaticInputMode = useMemo(
    () => editorState.input === ControlInputOption.STATIC,
    [editorState.input]
  );

  const isESQLOutputMode = useMemo(
    () => editorState.output === ControlOutputOption.ESQL,
    [editorState.output]
  );

  const [hasTouchedOutput, setHasTouchedOutput] = useState(isEdit);

  useEffect(() => {
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

    // When creating a new control, sync up the output mode with the input mode, unless the user
    // has already modified the output mode
    if (hasTouchedOutput) return;
    switch (editorState.input) {
      case ControlInputOption.DSL:
      case ControlInputOption.STATIC:
        if (editorState.output !== ControlOutputOption.DSL) {
          setEditorState({ ...editorState, output: ControlOutputOption.DSL });
          setDefaultPanelTitle(editorState.fieldName ?? '');
        }
        break;
      case ControlInputOption.ESQL:
        if (editorState.output !== ControlOutputOption.ESQL) {
          setEditorState({ ...editorState, output: ControlOutputOption.ESQL });
          setDefaultPanelTitle(editorState.esqlVariableString ?? DEFAULT_ESQL_VARIABLE_NAME);
        }
        break;
    }
  }, [hasTouchedOutput, editorState, defaultPanelTitle]);

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

  const CustomSettingsComponent = useMemo(() => {
    if (!controlFactory || !editorState.fieldName || !fieldRegistry) return;
    const CustomSettings = controlFactory.CustomOptionsComponent;

    if (!CustomSettings) return;

    return (
      <div data-test-subj="control-editor-custom-settings">
        <EuiSpacer size="m" />
        <CustomSettings
          initialState={initialState}
          field={fieldRegistry[editorState.fieldName].field}
          updateState={(newState) => setEditorState({ ...editorState, ...newState })}
          setControlEditorValid={setControlOptionsValid}
          controlGroupApi={controlGroupApi}
          output={editorState.output ?? DEFAULT_CONTROL_OUTPUT}
          input={editorState.input ?? DEFAULT_CONTROL_INPUT}
        />
      </div>
    );
  }, [fieldRegistry, controlFactory, initialState, editorState, controlGroupApi]);

  const inputStatus = useMemo(() => {
    if (isDSLInputMode) {
      const hasFieldName = !!editorState.fieldName;
      const hasSelectedDataView = !!selectedDataView;
      if (hasFieldName && hasSelectedDataView) return EditorComponentStatus.COMPLETE;
    } else if (isESQLInputMode) {
      return esqlQueryValidation;
    } else if (isStaticInputMode) {
      if (editorState.staticValues?.every(Boolean) && editorState.staticValues.length)
        return EditorComponentStatus.COMPLETE;
    }
    return EditorComponentStatus.INCOMPLETE;
  }, [
    esqlQueryValidation,
    editorState.fieldName,
    editorState.staticValues,
    isDSLInputMode,
    isESQLInputMode,
    isStaticInputMode,
    selectedDataView,
  ]);

  const outputStatus = useMemo(() => {
    if (isESQLOutputMode) {
      return editorState.esqlVariableString
        ? EditorComponentStatus.COMPLETE
        : EditorComponentStatus.INCOMPLETE;
    } else {
      return editorState.fieldName
        ? EditorComponentStatus.COMPLETE
        : EditorComponentStatus.INCOMPLETE;
    }
  }, [isESQLOutputMode, editorState.esqlVariableString, editorState.fieldName]);

  const controlConfigStatus = useMemo(() => {
    if (!selectedControlType) return EditorComponentStatus.INCOMPLETE;
    if (!controlOptionsValid) return EditorComponentStatus.ERROR;
    return EditorComponentStatus.COMPLETE;
  }, [selectedControlType, controlOptionsValid]);

  const steps: EuiContainedStepProps[] = [
    {
      title: 'Select input',
      status: useStepStatus(inputStatus, isEdit),
      children: (
        <SelectInput
          inputMode={editorState.input ?? DEFAULT_CONTROL_INPUT}
          editorState={editorState}
          editorConfig={editorConfig}
          selectedControlType={selectedControlType}
          setEditorState={setEditorState}
          setDefaultPanelTitle={setDefaultPanelTitle}
          setSelectedControlType={setSelectedControlType}
          setControlOptionsValid={setControlOptionsValid}
          setESQLQueryValidation={setEsqlQueryValidation}
          isEdit={isEdit}
        />
      ),
    },
    {
      title: 'Select output',
      status: useStepStatus(outputStatus, isEdit),
      children: (
        <>
          <EuiFormRow data-test-subj="control-editor-output-settings">
            <div>
              <OutputSelectRadioGroup
                idSelected={editorState.output ?? DEFAULT_CONTROL_OUTPUT}
                onChangeOutput={(output) => {
                  setEditorState({ ...editorState, output });
                  setHasTouchedOutput(true);
                }}
                isDSLInputMode={isDSLInputMode}
                fieldName={editorState.fieldName}
              />
            </div>
          </EuiFormRow>
          {editorState.output === ControlOutputOption.ESQL ? (
            <EuiFormRow label="Variable name">
              <EuiFieldText
                placeholder={DEFAULT_ESQL_VARIABLE_NAME}
                value={editorState.esqlVariableString}
                compressed
                onChange={({ target: { value } }) => {
                  const esqlVariableString = value.startsWith('?')
                    ? value.startsWith('???')
                      ? `??${value.replace(/\?/g, '')}`
                      : value
                    : `?${value}`;
                  setEditorState({ ...editorState, esqlVariableString });
                  setDefaultPanelTitle(esqlVariableString);
                }}
              />
            </EuiFormRow>
          ) : isESQLInputMode ? (
            <EuiPanel hasBorder>
              <EuiFlexGroup
                alignItems="center"
                justifyContent="center"
                direction="column"
                wrap
                gutterSize="s"
              >
                <EuiFlexItem>
                  <EuiText textAlign="center" size="s">
                    {DataControlEditorStrings.manageControl.fieldOutput.getFieldOutputDescription(
                      editorState.fieldName
                    )}
                  </EuiText>
                </EuiFlexItem>
                <EuiFlexItem>
                  <EuiPopover
                    isOpen={isFieldOutputPopoverOpen}
                    closePopover={() => setIsFieldOutputPopoverOpen(false)}
                    button={
                      <EuiButtonEmpty onClick={() => setIsFieldOutputPopoverOpen(true)}>
                        {DataControlEditorStrings.manageControl.fieldOutput.getSelectFieldTitle(
                          !!editorState.fieldName
                        )}
                      </EuiButtonEmpty>
                    }
                  >
                    <DataViewAndFieldPicker
                      editorConfig={editorConfig}
                      dataViewId={editorState.dataViewId}
                      onChangeDataViewId={(newDataViewId) => {
                        setEditorState({ ...editorState, dataViewId: newDataViewId });
                      }}
                      onSelectField={(field) => {
                        setEditorState({ ...editorState, fieldName: field.name });
                        /**
                         * set the control title (i.e. the one set by the user) + default title (i.e. the field display name)
                         */
                        const newDefaultTitle = field.displayName ?? field.name;
                        setDefaultPanelTitle(newDefaultTitle);
                      }}
                      fieldName={editorState.fieldName}
                    />
                  </EuiPopover>
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiPanel>
          ) : isStaticInputMode ? (
            <DataViewAndFieldPicker
              editorConfig={editorConfig}
              dataViewId={editorState.dataViewId}
              onChangeDataViewId={(newDataViewId) => {
                setEditorState({ ...editorState, dataViewId: newDataViewId });
              }}
              onSelectField={(field) => {
                setEditorState({ ...editorState, fieldName: field.name });
                /**
                 * set the control title (i.e. the one set by the user) + default title (i.e. the field display name)
                 */
                const newDefaultTitle = field.displayName ?? field.name;
                setDefaultPanelTitle(newDefaultTitle);
              }}
              fieldName={editorState.fieldName}
            />
          ) : null}
        </>
      ),
    },
    {
      title: 'Configure control',
      status: useStepStatus(controlConfigStatus, isEdit),
      children: (
        <>
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
                isStaticInputMode={isStaticInputMode}
              />
            </div>
          </EuiFormRow>
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
                setEditorState({
                  ...editorState,
                  title: e.target.value === '' ? undefined : e.target.value,
                });
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
                    setEditorState({ ...editorState, width: newWidth as ControlWidth })
                  }
                />
                <EuiSpacer size="s" />
                <EuiSwitch
                  compressed
                  label={DataControlEditorStrings.manageControl.displaySettings.getGrowSwitchTitle()}
                  color="primary"
                  checked={editorState.grow ?? DEFAULT_CONTROL_GROW}
                  onChange={() => setEditorState({ ...editorState, grow: !editorState.grow })}
                  data-test-subj="control-editor-grow-switch"
                />
              </div>
            </EuiFormRow>
          )}
          {!editorConfig?.hideAdditionalSettings && CustomSettingsComponent}
        </>
      ),
    },
  ];

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
              ? DataControlEditorStrings.manageControl.getFlyoutCreateTitle()
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
          <EuiSteps steps={steps} titleSize="xxs" />
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
                aria-label={`save-${editorState.title ?? editorState.fieldName}`}
                data-test-subj="control-editor-save"
                fill
                color="primary"
                disabled={
                  !(
                    inputStatus === EditorComponentStatus.COMPLETE &&
                    outputStatus === EditorComponentStatus.COMPLETE &&
                    controlConfigStatus === EditorComponentStatus.COMPLETE
                  )
                }
                onClick={() => {
                  onSave(editorState, selectedControlType!);
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

const OutputSelectRadioGroup: React.FC<{
  idSelected?: ControlOutputOption;
  onChangeOutput: (option: string) => void;
  fieldName?: string;
  isDSLInputMode: boolean;
}> = ({ idSelected = DEFAULT_CONTROL_OUTPUT, onChangeOutput, fieldName, isDSLInputMode }) => {
  const radioGroupId = useGeneratedHtmlId({ prefix: 'radioGroup' });
  return CONTROL_OUTPUT_OPTIONS.map(
    ({ id, label, description, 'data-test-subj': dataTestSubj }) => (
      <>
        <EuiCheckableCard
          id={id}
          name={radioGroupId}
          key={radioGroupId}
          checkableType="radio"
          label={<strong>{label}</strong>}
          checked={idSelected === id}
          onChange={() => onChangeOutput(id)}
          data-test-subj={dataTestSubj}
        >
          <EuiText size="s">{description(isDSLInputMode, fieldName)}</EuiText>
          {/**
           * Add a click target to allow the user to click anywhere on the EuiCheckableCard to select an output
           * option, instead of having to target the radio button or the title label.
           * EuiCheckableCard does not make the whole body clickable to allow for interactive children
           * https://github.com/elastic/eui/issues/8900
           * Overlay the inner card panel with an invisible clickable div; disable a11y linting rule
           * because the radio group is already the a11y target, and clickable div is purely a
           * workaround for mouse interaction
           */}
          {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events */}
          <div
            onClick={() => onChangeOutput(id)}
            data-test-subj="output-select-click-target"
            css={css`
              cursor: pointer;
              position: absolute;
              top: 0;
              left: 0;
              width: 100%;
              height: 100%;
            `}
          />
        </EuiCheckableCard>
        <EuiSpacer size="s" />
      </>
    )
  );
};
