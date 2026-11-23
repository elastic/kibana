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
import {
  isSameControlSource,
  resolveControlSource,
  toControlSourceDescriptor,
} from '../../utils/control_source';
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

const CompatibleControlTypesComponent = ({
  field_name,
  source,
  selectedControlType: selectedAction,
  setSelectedControlType: setSelectedAction,
}: Pick<DataControlEditorState, 'field_name'> & {
  source?: FilterableSource;
  selectedControlType?: string;
  setSelectedControlType: (type: string) => void;
}) => {
  const controlActionRegistry = useControlActionRegistry();
  const [isCompatible, setIsCompatible] = useState<{ [type: string]: boolean }>({});

  const controlTypeContext = useMemo(
    () => ({
      trigger: triggers[CONTROL_MENU_TRIGGER],
      embeddable: undefined, // parentApi isn't necessary for this
      state: { field_name },
      source,
    }),
    [field_name, source]
  );

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

  useEffect(() => {
    const asyncGetCompatibility = async () => {
      const compatibilityMap: { [type: string]: boolean } = {};
      await asyncForEach(Object.values(controlActionRegistry ?? {}), async (action) => {
        const compatible = await action.isCompatible(controlTypeContext);
        compatibilityMap[action.id] = compatible;
      });
      setIsCompatible(compatibilityMap);
    };
    asyncGetCompatibility();
  }, [controlActionRegistry, controlTypeContext]);

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
                  fieldSelected: Boolean(source && field_name),
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

  // a query is resolved once it has run, not on every keystroke
  const canResolveSource = isESQLValuesSource
    ? esqlQueryValidation && Boolean(editorState.esql_query)
    : Boolean(editorState.data_view_id);
  const sourceDescriptor = useMemo(
    () =>
      canResolveSource
        ? toControlSourceDescriptor({
            values_source: editorState.values_source,
            data_view_id: editorState.data_view_id,
            esql_query: editorState.esql_query,
          })
        : undefined,
    [canResolveSource, editorState.values_source, editorState.data_view_id, editorState.esql_query]
  );
  const {
    loading: sourceLoading,
    value: resolved,
    error: fieldListError,
  } = useAsync(async () => {
    if (!sourceDescriptor) return;
    const dataSource = await resolveControlSource(sourceDescriptor, { parentApi });
    const filterableSource = await dataSource.toFilterableSource(coreServices.http);
    return { descriptor: sourceDescriptor, dataSource, filterableSource };
  }, [sourceDescriptor]);
  // the source of a previous descriptor stays until the next one is resolved
  const selectedSource =
    resolved && sourceDescriptor && isSameControlSource(resolved.descriptor, sourceDescriptor)
      ? resolved
      : undefined;
  const filterableSource = selectedSource?.filterableSource;
  // picking a field of a data view is DSL management, so the picker gets the data view itself
  const selectedDataView =
    selectedSource?.dataSource.kind === 'index-pattern'
      ? selectedSource.dataSource.getDataView()
      : undefined;

  const CustomSettingsComponent = useMemo(() => {
    if (!selectedControlType) return;
    const CustomSettings =
      controlActionRegistry[selectedControlType]?.extension?.CustomOptionsComponent;
    if (!CustomSettings || !filterableSource || !editorState.field_name) return;

    const field = filterableSource.getFieldByName(editorState.field_name);
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
  }, [filterableSource, initialState, editorState, controlActionRegistry, selectedControlType]);

  const valuesSourceValid = useMemo(() => {
    if (isESQLValuesSource) return esqlQueryValidation;
    return Boolean(editorState.field_name) && Boolean(filterableSource);
  }, [isESQLValuesSource, editorState.field_name, filterableSource, esqlQueryValidation]);

  const onChangeValuesSource = useCallback(
    (nextSource: string) => {
      const nextEsqlQuery =
        nextSource === ControlValuesSource.ESQL && !editorState.esql_query
          ? DataControlEditorStrings.manageControl.dataSource.getDefaultValuesQuery(
              filterableSource,
              editorState.field_name
            )
          : undefined;
      setEditorState({
        ...editorState,
        values_source: nextSource as ControlValuesSource,
        ...(nextEsqlQuery ? { esql_query: nextEsqlQuery } : {}),
      });
    },
    [editorState, filterableSource]
  );
  const esqlQueryNeedsRunning = useMemo(
    () => !valuesSourceValid && isESQLValuesSource,
    [isESQLValuesSource, valuesSourceValid]
  );

  /**
   * make sure that a newly selected field is compatible with the selected control type and, if it's not,
   * reset the selected control type to the **first** compatible control type. A field of a query is only
   * checked once the source of the query is resolved.
   */
  const [fieldToCheck, setFieldToCheck] = useState<string | undefined>();
  useEffect(() => {
    if (!fieldToCheck || !filterableSource) return;
    setFieldToCheck(undefined);
    const controlContext = {
      trigger: triggers[CONTROL_MENU_TRIGGER],
      embeddable: undefined,
      state: { field_name: fieldToCheck },
      source: filterableSource,
    };
    (async () => {
      if (
        selectedControlType &&
        (await controlActionRegistry[selectedControlType]?.isCompatible(controlContext))
      ) {
        return;
      }
      for (const action of Object.values(controlActionRegistry)) {
        if (await action?.isCompatible(controlContext)) {
          setSelectedControlType(action.type);
          return;
        }
      }
    })();
  }, [fieldToCheck, filterableSource, controlActionRegistry, selectedControlType]);

  const onChangeField = useCallback(
    (nextFieldName: string, nextFieldDisplayName?: string) => {
      setFieldToCheck(nextFieldName);

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
                    selectableProps={{ isLoading: dataViewListLoading || sourceLoading }}
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
                field_name={editorState.field_name}
                source={filterableSource}
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
                  onSave(isESQLValuesSource ? selectedDataView?.id : editorState.data_view_id);
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
