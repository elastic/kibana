/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useEffect, useMemo, useState } from 'react';
import useAsync from 'react-use/lib/useAsync';

import {
  EuiButton,
  EuiButtonEmpty,
  EuiButtonGroup,
  EuiCallOut,
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
  EuiCard,
  EuiPopover,
  EuiSelectOption,
} from '@elastic/eui';
import { DataView, DataViewField, DataViewListItem } from '@kbn/data-views-plugin/common';
import {
  LazyDataViewPicker,
  LazyFieldPicker,
  withSuspense,
} from '@kbn/presentation-util-plugin/public';

import { asyncMap } from '@kbn/std';
import { EuiContainedStepProps } from '@elastic/eui/src/components/steps/steps';
import { css } from '@emotion/react';
import {
  DEFAULT_CONTROL_GROW,
  DEFAULT_CONTROL_WIDTH,
  type ControlWidth,
  type DefaultDataControlState,
  ControlGroupEditorConfig,
  ControlInputOption,
  ControlOutputOption,
  DEFAULT_CONTROL_INPUT,
  DEFAULT_CONTROL_OUTPUT,
  ESQL_COMPATIBLE_CONTROL_TYPES,
} from '../../../common';
import { dataViewsService } from '../../services/kibana_services';
import { getAllControlTypes, getControlFactory } from '../../control_factory_registry';
import type { ControlGroupApi } from '../../control_group/types';
import { DataControlEditorStrings } from './data_control_constants';
import { getDataControlFieldRegistry } from './data_control_editor_utils';
import {
  CONTROL_INPUT_OPTIONS,
  CONTROL_OUTPUT_OPTIONS,
  CONTROL_WIDTH_OPTIONS,
  DEFAULT_ESQL_VARIABLE_NAME,
} from './editor_constants';
import {
  isDataControlFactory,
  type DataControlFactory,
  type DataControlFieldRegistry,
} from './types';
import { ControlFactory } from '../types';
import { confirmDeleteControl } from '../../common';
import { ListOptionsInput } from '../../common/list_options_input/list_options_input';
import { ESQLLangEditor } from './esql_lang_editor';

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
}

const FieldPicker = withSuspense(LazyFieldPicker, null);
const DataViewPicker = withSuspense(LazyDataViewPicker, null);

const CompatibleControlTypesComponent = ({
  fieldRegistry,
  selectedFieldName,
  selectedControlType,
  setSelectedControlType,
  isESQLOutputMode,
}: {
  fieldRegistry?: DataControlFieldRegistry;
  selectedFieldName?: string;
  selectedControlType?: string;
  setSelectedControlType: (type: string) => void;
  isESQLOutputMode: boolean;
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
          const disabled = isESQLOutputMode
            ? !ESQL_COMPATIBLE_CONTROL_TYPES.includes(factory.type)
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
}: ControlEditorProps<State>) => {
  const [editorState, setEditorState] = useState<Partial<State>>(initialState);
  const [defaultPanelTitle, setDefaultPanelTitle] = useState<string>(
    initialDefaultPanelTitle ?? initialState.fieldName ?? ''
  );
  const [panelTitle, setPanelTitle] = useState<string>(initialState.title ?? defaultPanelTitle);
  const [selectedControlType, setSelectedControlType] = useState<string | undefined>(controlType);
  const [controlOptionsValid, setControlOptionsValid] = useState<boolean>(true);
  const editorConfig = useMemo(() => controlGroupApi.getEditorConfig(), [controlGroupApi]);

  const [staticOptions, setStaticOptions] = useState<EuiSelectOption[]>([]);

  const [isFieldOutputPopoverOpen, setIsFieldOutputPopoverOpen] = useState<boolean>(false);

  const isEdit = useMemo(() => !!controlId, [controlId]); // if no ID, then we are creating a new control

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

  const isESQLVariableEmpty = useMemo(
    () => !editorState.esqlVariableString || editorState.esqlVariableString === '?',
    [editorState.esqlVariableString]
  );

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
        />
      </div>
    );
  }, [fieldRegistry, controlFactory, initialState, editorState, controlGroupApi]);

  const steps: EuiContainedStepProps[] = [
    {
      title: 'Select input',
      children: (
        <>
          <EuiFormRow data-test-subj="control-editor-input-select">
            <EuiButtonGroup
              isFullWidth
              options={CONTROL_INPUT_OPTIONS}
              idSelected={editorState.input ?? DEFAULT_CONTROL_INPUT}
              onChange={(input) => {
                setEditorState({ ...editorState, input });
              }}
              legend="Select control input"
            />
          </EuiFormRow>
          {isDSLInputMode && (
            <DataViewAndFieldPicker
              editorConfig={editorConfig}
              dataViewId={editorState.dataViewId}
              onChangeDataViewId={(newDataViewId) => {
                setEditorState({ ...editorState, dataViewId: newDataViewId });
                setSelectedControlType(undefined);
              }}
              onSelectField={(field) => {
                const newFieldName = field.name;
                const prevFieldName = editorState.fieldName;
                if (
                  // If the user is not in ES|QL output mode
                  editorState.output !== ControlOutputOption.ESQL ||
                  // Or, if the user the user is in ES|QL output mode, but has not changed the variable name
                  isESQLVariableEmpty ||
                  editorState.esqlVariableString === fieldToESQLVariable(prevFieldName ?? '')
                ) {
                  /**
                   * create a default ES|QL variable name from the selected field before setting the field name;
                   * we still want to do this even if the user is not in ES|QL output mode, to prepare the variable
                   * name in case they switch
                   */
                  const esqlVariableString = fieldToESQLVariable(newFieldName);
                  setEditorState({ ...editorState, fieldName: newFieldName, esqlVariableString });
                  setDefaultPanelTitle(esqlVariableString);
                } else {
                  /**
                   * if the variable name doesn't need changing, just set the field name
                   */
                  setEditorState({ ...editorState, fieldName: newFieldName });
                }
                /**
                 * make sure that the new field is compatible with the selected control type and, if it's not,
                 * reset the selected control type to the **first** compatible control type
                 */
                const newCompatibleControlTypes =
                  fieldRegistry?.[newFieldName]?.compatibleControlTypes ?? [];
                if (
                  !selectedControlType ||
                  !newCompatibleControlTypes.includes(selectedControlType!)
                ) {
                  setSelectedControlType(newCompatibleControlTypes[0]);
                }

                /**
                 * set the control title (i.e. the one set by the user) + default title (i.e. the field display name)
                 */
                const newDefaultTitle = field.displayName ?? newFieldName;
                setDefaultPanelTitle(newDefaultTitle);

                setControlOptionsValid(true); // reset options state
              }}
              dataViewListError={dataViewListError}
              dataViewListItems={dataViewListItems}
              dataViewListLoading={dataViewListLoading}
              dataViewLoading={dataViewLoading}
              selectedDataView={selectedDataView}
              fieldListError={fieldListError}
              fieldName={editorState.fieldName}
              fieldRegistry={fieldRegistry}
            />
          )}
          {isESQLInputMode && (
            <ESQLLangEditor
              label={DataControlEditorStrings.manageControl.dataSource.getEsqlQueryTitle()}
              query={{ esql: editorState.esqlQuery ?? '' }}
              editorIsInline
              errors={[]}
              hideTimeFilterInfo={true}
              disableAutoFocus={true}
              hideRunQueryText
              onTextLangQueryChange={(q) => {
                setEditorState({ ...editorState, esqlQuery: q.esql });
              }}
              onTextLangQuerySubmit={async (q, a) => {
                // if (q) {
                //   await onValuesQuerySubmit(q.esql);
                // }
              }}
              isDisabled={false}
              isLoading={false}
              hasOutline
            />
          )}
          {isStaticInputMode && (
            <ListOptionsInput
              label={DataControlEditorStrings.manageControl.dataSource.getListOptionsTitle()}
              value={staticOptions}
              onChange={setStaticOptions}
            />
          )}
        </>
      ),
    },
    {
      title: 'Select output',
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
            <EuiCard hasBorder>
              <EuiText size="s">
                Filter will be created against the field <strong>category.keyword</strong>.{' '}
                <EuiPopover
                  isOpen={isFieldOutputPopoverOpen}
                  closePopover={() => setIsFieldOutputPopoverOpen(false)}
                  button={
                    <EuiButtonEmpty onClick={() => setIsFieldOutputPopoverOpen(true)}>
                      Change
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
                    dataViewListError={dataViewListError}
                    dataViewListItems={dataViewListItems}
                    dataViewListLoading={dataViewListLoading}
                    dataViewLoading={dataViewLoading}
                    selectedDataView={selectedDataView}
                    fieldListError={fieldListError}
                    fieldName={editorState.fieldName}
                    fieldRegistry={fieldRegistry}
                  />
                </EuiPopover>
              </EuiText>
            </EuiCard>
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
              dataViewListError={dataViewListError}
              dataViewListItems={dataViewListItems}
              dataViewListLoading={dataViewListLoading}
              dataViewLoading={dataViewLoading}
              selectedDataView={selectedDataView}
              fieldListError={fieldListError}
              fieldName={editorState.fieldName}
              fieldRegistry={fieldRegistry}
            />
          ) : null}
        </>
      ),
    },
    {
      title: 'Configure control',
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
    <>
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="s">
          <h2>
            {!isEdit
              ? DataControlEditorStrings.manageControl.getFlyoutCreateTitle()
              : DataControlEditorStrings.manageControl.getFlyoutEditTitle()}
          </h2>
        </EuiTitle>
      </EuiFlyoutHeader>
      <EuiFlyoutBody
        data-test-subj="control-editor-flyout"
        css={css`
          /* Fix code editor suggestions rendering */
          .euiFlyoutBody__overflow {
            transform: initial;
          }
        `}
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
                    controlOptionsValid &&
                    Boolean(editorState.fieldName) &&
                    (Boolean(selectedDataView) || !isDSLInputMode) &&
                    Boolean(selectedControlType)
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
    </>
  );
};

const fieldToESQLVariable = (fieldName: string) =>
  `?${fieldName.replace(/\./g, '_').replace(/[^a-zA-Z0-9_]/g, '')}`;

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
          key={id}
          checkableType="radio"
          label={<strong>{label}</strong>}
          checked={idSelected === id}
          onChange={() => onChangeOutput(id)}
        >
          <EuiText size="s">{description(isDSLInputMode, fieldName)}</EuiText>
        </EuiCheckableCard>
        <EuiSpacer size="s" />
      </>
    )
  );
};

const DataViewAndFieldPicker: React.FC<{
  dataViewId?: string;
  onChangeDataViewId: (dataView: string) => void;
  onSelectField: (field: DataViewField) => void;
  dataViewListItems: DataViewListItem[];
  dataViewListLoading: boolean;
  dataViewLoading: boolean;
  fieldName?: string;
  selectedDataView?: DataView;
  dataViewListError?: Error;
  fieldListError?: Error;
  editorConfig?: ControlGroupEditorConfig;
  fieldRegistry?: DataControlFieldRegistry;
}> = ({
  dataViewId,
  editorConfig,
  dataViewListError,
  onChangeDataViewId,
  onSelectField,
  dataViewListItems,
  dataViewListLoading,
  dataViewLoading,
  selectedDataView,
  fieldListError,
  fieldName,
  fieldRegistry,
}) => (
  <>
    {!editorConfig?.hideDataViewSelector && (
      <EuiFormRow
        data-test-subj="control-editor-data-view-picker"
        label={DataControlEditorStrings.manageControl.dataSource.getDataViewTitle()}
      >
        {dataViewListError ? (
          <EuiCallOut
            color="danger"
            iconType="error"
            title={DataControlEditorStrings.manageControl.dataSource.getDataViewListErrorTitle()}
          >
            <p>{dataViewListError.message}</p>
          </EuiCallOut>
        ) : (
          <DataViewPicker
            dataViews={dataViewListItems}
            selectedDataViewId={dataViewId}
            onChangeDataViewId={onChangeDataViewId}
            trigger={{
              label:
                selectedDataView?.getName() ??
                DataControlEditorStrings.manageControl.dataSource.getSelectDataViewMessage(),
            }}
            selectableProps={{ isLoading: dataViewListLoading }}
          />
        )}
      </EuiFormRow>
    )}
    <EuiFormRow label={DataControlEditorStrings.manageControl.dataSource.getFieldTitle()}>
      {fieldListError ? (
        <EuiCallOut
          color="danger"
          iconType="error"
          title={DataControlEditorStrings.manageControl.dataSource.getFieldListErrorTitle()}
        >
          <p>{fieldListError.message}</p>
        </EuiCallOut>
      ) : (
        <FieldPicker
          filterPredicate={(field: DataViewField) => {
            const customPredicate = editorConfig?.fieldFilterPredicate?.(field) ?? true;
            return Boolean(fieldRegistry?.[field.name]) && customPredicate;
          }}
          selectedFieldName={fieldName}
          dataView={selectedDataView}
          onSelectField={onSelectField}
          selectableProps={{ isLoading: dataViewListLoading || dataViewLoading }}
        />
      )}
    </EuiFormRow>
  </>
);
