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
  EuiTitle,
  EuiToolTip,
} from '@elastic/eui';
import type { ControlGroupEditorConfig } from '@kbn/control-group-renderer';
import { apiHasEditorConfig } from '@kbn/control-group-renderer';
import type { DataViewField } from '@kbn/data-views-plugin/common';
import {
  LazyDataViewPicker,
  LazyFieldPicker,
  withSuspense,
} from '@kbn/presentation-util-plugin/public';
import { asyncForEach } from '@kbn/std';
import { KbnDangerCallout } from '@kbn/ui-callout';

import { triggers } from '@kbn/ui-actions-plugin/public';
import { CONTROL_MENU_TRIGGER } from '@kbn/ui-actions-plugin/common/trigger_ids';
import { ControlValuesSource, DEFAULT_CONTROL_VALUES_SOURCE } from '@kbn/controls-constants';
import type { FilterableSource } from '@kbn/data-source';
import { useStateFromPublishingSubject } from '@kbn/presentation-publishing';
import type { PublishesESQLVariables } from '@kbn/esql-types';
import { type CreateControlTypeAction } from '../../../actions/control_panel_actions';
import {
  coreServices,
  dataViewsService,
  uiActionsService,
} from '../../../services/kibana_services';
import { DataControlEditorStrings } from '../data_control_constants';
import type { ControlTypeFieldStatus } from '../data_control_constants';
import { getDataViewOfSource, resolveControlSource } from '../../utils/resolve_control_source';
import type { DataControlEditorState } from './types';
import type { ReopenDataControlEditorOverrides } from '../open_data_control_editor';
import { ConfigureValuesQuery } from './configure_values_query';

export interface ControlEditorProps<State extends DataControlEditorState = DataControlEditorState> {
  initialState: Partial<State>;
  controlType?: string;
  controlId?: string;
  initialDefaultPanelTitle?: string;
  parentApi: unknown;
  onCancel: (newState: Partial<State>) => void;
  onSave: (data_view_id?: string) => void;
  onUpdate: (newState: Partial<State>) => void;
  ariaLabelledBy: string;
  reopenEditor?: (overrides: ReopenDataControlEditorOverrides<State>) => void;
}

const FieldPicker = withSuspense(LazyFieldPicker, null);
const DataViewPicker = withSuspense(LazyDataViewPicker, null);

interface ControlActionRegistry {
  [type: string]: CreateControlTypeAction;
}
const useControlActionRegistry = (): ControlActionRegistry => {
  const [controlActionRegistry, setControlActionRegistry] = useState<ControlActionRegistry>({});

  useEffect(() => {
    let cancelled = false;

    uiActionsService
      .getTriggerActions(CONTROL_MENU_TRIGGER)
      .then((controlTypeActions) => {
        if (!cancelled) {
          setControlActionRegistry(
            controlTypeActions.reduce(
              (prev, action) => ({ ...prev, [action.type]: action as CreateControlTypeAction }),
              {} as ControlActionRegistry
            )
          );
        }
      })
      .catch(() => {
        if (!cancelled) setControlActionRegistry({});
      });

    return () => {
      cancelled = true;
    };
  }, []);
  return controlActionRegistry;
};

type ControlTypeContext = Parameters<CreateControlTypeAction['isCompatible']>[0];

/**
 * Whether each control type, by action id, can be used for the field of the context. It also gives the
 * context that it was computed for, since the result of the previous context stays until the next one.
 */
const useControlTypeCompatibility = (
  controlActionRegistry: ControlActionRegistry,
  controlTypeContext: ControlTypeContext
) =>
  useAsync(async () => {
    const isCompatible: { [actionId: string]: boolean } = {};
    await asyncForEach(Object.values(controlActionRegistry), async (action) => {
      isCompatible[action.id] = await action.isCompatible(controlTypeContext);
    });
    return { isCompatible, forContext: controlTypeContext };
  }, [controlActionRegistry, controlTypeContext]);

const getFieldStatus = (
  fieldName: string | undefined,
  source: FilterableSource | undefined
): ControlTypeFieldStatus => {
  if (!fieldName) return 'noField';
  if (source && !source.getFieldByName(fieldName)) return 'notInSource';
  return 'incompatible';
};

const CompatibleControlTypesComponent = ({
  controlActionRegistry,
  controlTypeContext,
  isCompatible,
  selectedControlType: selectedAction,
  setSelectedControlType: setSelectedAction,
}: {
  controlActionRegistry: ControlActionRegistry;
  controlTypeContext: ControlTypeContext;
  /** Whether each control type, by action id, can be used for the field of the context */
  isCompatible: { [actionId: string]: boolean };
  selectedControlType?: string;
  setSelectedControlType: (type: string) => void;
}) => {
  const {
    state: { field_name },
    source,
  } = controlTypeContext;

  const sortedActionArray: CreateControlTypeAction[] = useMemo(() => {
    // Destructuring `a` and `b` in the sort() call messes with internal binding of `this` within the underlying
    // action class, so we have to refer to to them directly by name
    return Object.values(controlActionRegistry ?? {}).sort((a, b) => {
      const orderComparison = (b.order ?? 0) - (a.order ?? 0); // sort descending by order
      return orderComparison === 0
        ? a.getDisplayName().localeCompare(b.getDisplayName()) // if equal order, compare display names
        : orderComparison;
    });
  }, [controlActionRegistry]);

  return (
    <EuiSkeletonRectangle isLoading={!sortedActionArray.length} width="100px" height="100px">
      <EuiKeyPadMenu data-test-subj={`controlTypeMenu`} aria-label={'type'}>
        {(sortedActionArray ?? []).map((action) => {
          const disabled = !isCompatible[action.id];
          const keyPadMenuItem = (
            <EuiKeyPadMenuItem
              key={action.type}
              id={`create__${action.type}`}
              aria-label={action.getDisplayName(controlTypeContext)}
              data-test-subj={`create__${action.type}`}
              isSelected={action.type === selectedAction}
              disabled={disabled}
              onClick={() => setSelectedAction(action.type)}
              label={action.getDisplayName(controlTypeContext)}
            >
              <EuiIcon
                type={action.getIconType(controlTypeContext) ?? 'controls'}
                size="l"
                aria-hidden={true}
              />
            </EuiKeyPadMenuItem>
          );

          return disabled ? (
            <EuiToolTip
              key={`disabled__${action.type}`}
              content={DataControlEditorStrings.manageControl.dataSource.getControlTypeErrorMessage(
                {
                  fieldStatus: getFieldStatus(field_name, source),
                  controlType: action.type,
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

export const DataControlEditor = <State extends DataControlEditorState = DataControlEditorState>({
  initialState,
  controlId,
  controlType, // initial control type
  initialDefaultPanelTitle,
  onSave,
  onUpdate,
  onCancel,
  parentApi,
  ariaLabelledBy,
  reopenEditor,
}: ControlEditorProps<State>) => {
  const isEdit = useMemo(() => !!controlId, [controlId]); // if no ID, then we are creating a new control
  const controlActionRegistry = useControlActionRegistry();

  const [editorState, setEditorState] = useState<Partial<State>>(initialState);
  const updateEditorState = useCallback(
    (update: Partial<State>) => setEditorState((state) => ({ ...state, ...update })),
    []
  );
  const [defaultPanelTitle, setDefaultPanelTitle] = useState<string>(
    initialDefaultPanelTitle ?? initialState.field_name ?? ''
  );
  const [panelTitle, setPanelTitle] = useState<string>(initialState.title ?? defaultPanelTitle);
  const [selectedControlType, setSelectedControlType] = useState<string | undefined>(controlType);
  const [controlOptionsValid, setControlOptionsValid] = useState<boolean>(true);

  const editorConfig = useMemo<ControlGroupEditorConfig | undefined>(() => {
    return apiHasEditorConfig(parentApi) ? parentApi.getEditorConfig() : undefined;
  }, [parentApi]);

  const isESQLValuesSource = useMemo(
    () => editorState.values_source === ControlValuesSource.ESQL,
    [editorState.values_source]
  );
  const [esqlQueryValidation, setESQLQueryValidation] = useState<boolean>(
    isEdit && isESQLValuesSource ? true : false
  );
  const parentESQLVariables = useStateFromPublishingSubject(
    (parentApi as PublishesESQLVariables)?.esqlVariables$
  );

  const {
    loading: dataViewListLoading,
    value: dataViewListItems = [],
    error: dataViewListError,
  } = useAsync(async () => {
    return dataViewsService.getIdsWithTitle();
  });

  // A query has a data source once it has run, so that it is not requested on every keystroke
  const canResolveSource = isESQLValuesSource ? esqlQueryValidation : !!editorState.data_view_id;

  const {
    loading: dataSourceLoading,
    value: controlSource,
    error: fieldListError,
  } = useAsync(
    async () =>
      canResolveSource
        ? resolveControlSource(
            {
              values_source: editorState.values_source,
              data_view_id: editorState.data_view_id,
              esql_query: editorState.esql_query,
            },
            { parentApi }
          )
        : undefined,
    [canResolveSource, editorState.values_source, editorState.data_view_id, editorState.esql_query]
  );
  const selectedSource = controlSource?.filterableSource;
  // only a field has a data view to pick the field from
  const selectedDataView = getDataViewOfSource(controlSource?.dataSource);

  const CustomSettingsComponent = useMemo(() => {
    if (!selectedControlType) return;
    const CustomSettings =
      controlActionRegistry[selectedControlType]?.extension?.CustomOptionsComponent;
    if (!CustomSettings || !selectedSource || !editorState.field_name) return;

    const field = editorState.field_name
      ? selectedSource.getFieldByName(editorState.field_name)
      : undefined;
    if (!field) return;

    return (
      <div data-test-subj="control-editor-custom-settings">
        <EuiSpacer size="m" />
        <CustomSettings
          initialState={initialState}
          field={field}
          updateState={(newState) => setEditorState({ ...editorState, ...newState })}
          setControlEditorValid={setControlOptionsValid}
        />
      </div>
    );
  }, [selectedSource, initialState, editorState, controlActionRegistry, selectedControlType]);

  const valuesSourceValid = useMemo(() => {
    if (isESQLValuesSource) return esqlQueryValidation;
    const hasFieldName = !!editorState.field_name;
    const hasSelectedDataView = !!selectedDataView;
    return hasFieldName && hasSelectedDataView;
  }, [isESQLValuesSource, editorState.field_name, selectedDataView, esqlQueryValidation]);

  const onChangeValuesSource = useCallback(
    (nextSource: string) => {
      const nextEsqlQuery =
        nextSource === ControlValuesSource.ESQL && !editorState.esql_query
          ? DataControlEditorStrings.manageControl.dataSource.getDefaultValuesQuery(
              selectedSource,
              editorState.field_name
            )
          : undefined;
      // the field of a query goes with the data view that it reads, and with nothing when it reads an ES|QL source
      const fieldOfQuery =
        isESQLValuesSource && selectedSource
          ? {
              data_view_id: selectedDataView?.id,
              field_name: selectedDataView ? editorState.field_name : undefined,
            }
          : {};
      setEditorState({
        ...editorState,
        values_source: nextSource as ControlValuesSource,
        ...(nextEsqlQuery ? { esql_query: nextEsqlQuery } : {}),
        ...(nextSource === ControlValuesSource.FIELD ? fieldOfQuery : {}),
      });
    },
    [editorState, selectedSource, selectedDataView, isESQLValuesSource]
  );
  const esqlQueryNeedsRunning = useMemo(
    () => !valuesSourceValid && isESQLValuesSource,
    [isESQLValuesSource, valuesSourceValid]
  );

  const controlTypeContext = useMemo(
    () => ({
      trigger: triggers[CONTROL_MENU_TRIGGER],
      embeddable: undefined, // parentApi isn't necessary for this
      state: { field_name: editorState.field_name },
      source: selectedSource,
    }),
    [editorState.field_name, selectedSource]
  );
  const { value: compatibility } = useControlTypeCompatibility(
    controlActionRegistry,
    controlTypeContext
  );

  /**
   * make sure that the field is compatible with the selected control type and, if it's not, reset the
   * selected control type to the **first** compatible control type. It needs the source of the field, which
   * a query only has after it has run.
   */
  useEffect(() => {
    if (!compatibility || compatibility.forContext !== controlTypeContext) return;
    if (!selectedSource || !editorState.field_name) return;
    const selectedAction = selectedControlType
      ? controlActionRegistry[selectedControlType]
      : undefined;
    if (selectedAction && compatibility.isCompatible[selectedAction.id]) return;
    const firstCompatible = Object.values(controlActionRegistry).find(
      (action) => compatibility.isCompatible[action.id]
    );
    if (firstCompatible) setSelectedControlType(firstCompatible.type);
  }, [
    compatibility,
    controlTypeContext,
    controlActionRegistry,
    selectedSource,
    editorState.field_name,
    selectedControlType,
  ]);

  const onChangeField = useCallback(
    (nextFieldName: string, nextFieldDisplayName?: string) => {
      /**
       * set the control title (i.e. the one set by the user) + default title (i.e. the field display name)
       */
      const newDefaultTitle = nextFieldDisplayName ?? nextFieldName;
      setDefaultPanelTitle(newDefaultTitle);
      const currentTitle = editorState.title;
      if (!currentTitle || currentTitle === newDefaultTitle) {
        setPanelTitle(newDefaultTitle);
      }
    },
    [editorState.title]
  );

  return (
    <>
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="s">
          <h2 id={ariaLabelledBy}>
            {!controlId // if no ID, then we are creating a new control
              ? DataControlEditorStrings.manageControl.getFlyoutCreateTitle()
              : DataControlEditorStrings.manageControl.getFlyoutEditTitle()}
          </h2>
        </EuiTitle>
      </EuiFlyoutHeader>
      <EuiFlyoutBody data-test-subj="control-editor-flyout">
        <EuiForm fullWidth>
          {!editorConfig?.hideValuesSourceSelector && (
            <EuiFormRow data-test-subj="control-editor-values-source-select">
              <EuiButtonGroup
                isFullWidth
                options={[
                  {
                    id: ControlValuesSource.FIELD,
                    'data-test-subj': 'control-editor-input-dsl',
                    label:
                      DataControlEditorStrings.manageControl.dataSource.valuesSourceOptions.getFieldOptionLabel(),
                  },
                  {
                    id: ControlValuesSource.ESQL,
                    'data-test-subj': 'control-editor-input-esql',
                    toolTipContent:
                      DataControlEditorStrings.manageControl.dataSource.valuesSourceOptions.getQueryOptionTooltip(),
                    label:
                      DataControlEditorStrings.manageControl.dataSource.valuesSourceOptions.getQueryOptionLabel(),
                  },
                ]}
                idSelected={editorState.values_source ?? DEFAULT_CONTROL_VALUES_SOURCE}
                onChange={onChangeValuesSource}
                legend="Select control input"
              />
            </EuiFormRow>
          )}
          {editorState.values_source === ControlValuesSource.FIELD && (
            <>
              {!editorConfig?.hideDataViewSelector && (
                <EuiFormRow
                  data-test-subj="control-editor-data-view-picker"
                  label={DataControlEditorStrings.manageControl.dataSource.getDataViewTitle()}
                >
                  {dataViewListError ? (
                    <KbnDangerCallout
                      announceOnMount
                      title={DataControlEditorStrings.manageControl.dataSource.getDataViewListErrorTitle()}
                      text={dataViewListError.message}
                    />
                  ) : (
                    <DataViewPicker
                      dataViews={dataViewListItems}
                      selectedDataViewId={editorState.data_view_id}
                      onChangeDataViewId={(newdata_view_id) => {
                        setEditorState({ ...editorState, data_view_id: newdata_view_id });
                        setSelectedControlType(undefined);
                      }}
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
                  <KbnDangerCallout
                    announceOnMount
                    title={DataControlEditorStrings.manageControl.dataSource.getFieldListErrorTitle()}
                    text={fieldListError.message}
                  />
                ) : (
                  <FieldPicker
                    filterPredicate={(field: DataViewField) => {
                      const customPredicate = editorConfig?.fieldFilterPredicate?.(field) ?? true;
                      return (
                        (Object.values(controlActionRegistry) ?? []).some((action) =>
                          action.extension?.isFieldCompatible(field)
                        ) && customPredicate
                      );
                    }}
                    selectedFieldName={editorState.field_name}
                    dataView={selectedDataView}
                    onSelectField={(field) => {
                      setEditorState({ ...editorState, field_name: field.name });
                      onChangeField(field.name, field.displayName);
                      setControlOptionsValid(true); // reset options state
                    }}
                    selectableProps={{ isLoading: dataViewListLoading || dataSourceLoading }}
                  />
                )}
              </EuiFormRow>
            </>
          )}
          {editorState.values_source === ControlValuesSource.ESQL && (
            <ConfigureValuesQuery
              editorState={editorState}
              // ConfigureValuesQuery only touches base DataControlEditorState fields
              updateEditorState={(state) => {
                updateEditorState(state as Partial<State>);
                if (state.field_name) onChangeField(state.field_name);
              }}
              setESQLQueryValidation={setESQLQueryValidation}
              isEdit={isEdit}
              esqlVariables={parentESQLVariables}
              parentApi={parentApi}
              selectedControlType={selectedControlType}
              reopenEditor={
                reopenEditor
                  ? (esqlOverrides) =>
                      reopenEditor({
                        initialState: { ...editorState, ...(esqlOverrides as Partial<State>) },
                        controlType: selectedControlType,
                        initialDefaultPanelTitle: defaultPanelTitle,
                      })
                  : undefined
              }
            />
          )}
          <EuiFormRow
            label={DataControlEditorStrings.manageControl.dataSource.getControlTypeTitle()}
          >
            {/* wrapping in `div` so that focus gets passed properly to the form row */}
            <div>
              <CompatibleControlTypesComponent
                controlActionRegistry={controlActionRegistry}
                controlTypeContext={controlTypeContext}
                isCompatible={compatibility?.isCompatible ?? {}}
                selectedControlType={selectedControlType}
                setSelectedControlType={setSelectedControlType}
              />
            </div>
          </EuiFormRow>
          <EuiFormRow
            label={DataControlEditorStrings.manageControl.displaySettings.getTitleInputTitle()}
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
          {!editorConfig?.hideAdditionalSettings && CustomSettingsComponent}
        </EuiForm>
      </EuiFlyoutBody>
      <EuiFlyoutFooter>
        <EuiFlexGroup responsive={false} justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              aria-label={`cancel-${editorState.title ?? editorState.field_name}`}
              data-test-subj="control-editor-cancel"
              onClick={() => {
                onCancel(editorState);
              }}
            >
              {DataControlEditorStrings.manageControl.getCancelTitle()}
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiToolTip content={esqlQueryNeedsRunning ? 'Run the ES|QL query to save' : ''}>
              <EuiButton
                aria-label={`save-${editorState.title ?? editorState.field_name}`}
                data-test-subj="control-editor-save"
                fill
                color="primary"
                disabled={
                  !(controlOptionsValid && Boolean(selectedControlType) && valuesSourceValid)
                }
                hasAriaDisabled={esqlQueryNeedsRunning}
                onClick={() => {
                  const transformedState: Partial<State> | undefined =
                    selectedControlType && editorConfig && editorConfig.controlStateTransform
                      ? (editorConfig.controlStateTransform(
                          editorState,
                          selectedControlType
                        ) as Partial<State>)
                      : undefined;

                  if (selectedControlType && (!controlId || controlType !== selectedControlType)) {
                    // we need to create a new control from scratch
                    try {
                      controlActionRegistry[selectedControlType]?.execute({
                        trigger: triggers[CONTROL_MENU_TRIGGER],
                        embeddable: parentApi,
                        state: transformedState ?? editorState,
                        controlId,
                      });
                    } catch (e) {
                      coreServices.notifications.toasts.addError(e, {
                        title: DataControlEditorStrings.manageControl.getOnSaveError(),
                      });
                    }
                  } else {
                    // the control already exists with the expected type, so just update it
                    onUpdate(transformedState ?? editorState);
                  }
                  // the id of an ES|QL source is not the id of a data view that a next control can start from
                  onSave(selectedDataView?.id);
                }}
              >
                {DataControlEditorStrings.manageControl.getSaveChangesTitle()}
              </EuiButton>
            </EuiToolTip>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </>
  );
};
