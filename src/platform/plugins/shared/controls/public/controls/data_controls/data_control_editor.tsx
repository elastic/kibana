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
  EuiTitle,
  EuiToolTip,
} from '@elastic/eui';
import type { ControlGroupEditorConfig } from '@kbn/control-group-renderer';
import { apiHasEditorConfig } from '@kbn/control-group-renderer';
import type { DataControlState } from '@kbn/controls-schemas';
import type { DataViewField } from '@kbn/data-views-plugin/common';
import { type SerializedTitles } from '@kbn/presentation-publishing';
import {
  LazyDataViewPicker,
  LazyFieldPicker,
  withSuspense,
} from '@kbn/presentation-util-plugin/public';
import { asyncForEach } from '@kbn/std';

import { triggers } from '@kbn/ui-actions-plugin/public';
import { CONTROL_MENU_TRIGGER } from '@kbn/ui-actions-plugin/common/trigger_ids';
import { type CreateControlTypeAction } from '../../actions/control_panel_actions';
import { coreServices, dataViewsService, uiActionsService } from '../../services/kibana_services';
import { DataControlEditorStrings } from './data_control_constants';

type DataControlEditorState = DataControlState & SerializedTitles;

export interface ControlEditorProps<State extends DataControlEditorState = DataControlEditorState> {
  initialState: Partial<State>;
  controlType?: string;
  controlId?: string;
  initialDefaultPanelTitle?: string;
  parentApi: unknown;
  onCancel: (newState: Partial<State>) => void;
  onSave: (dataViewId?: string) => void;
  onUpdate: (newState: Partial<State>) => void;
  ariaLabelledBy: string;
  isPinned?: boolean;
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
  dataViewId,
  fieldName,
  selectedControlType: selectedAction,
  setSelectedControlType: setSelectedAction,
}: Partial<DataControlEditorState> & {
  selectedControlType?: string;
  setSelectedControlType: (type: string) => void;
}) => {
  const controlActionRegistry = useControlActionRegistry();
  const [isCompatible, setIsCompatible] = useState<{ [type: string]: boolean }>({});

  const controlTypeContext = useMemo(
    () => ({
      trigger: triggers[CONTROL_MENU_TRIGGER],
      embeddable: undefined, // parentApi isn't necessary for this
      state: { dataViewId, fieldName },
    }),
    [dataViewId, fieldName]
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
                type={action.getIconType(controlTypeContext) ?? 'controlsHorizontal'}
                size="l"
              />
            </EuiKeyPadMenuItem>
          );

          return disabled ? (
            <EuiToolTip
              key={`disabled__${action.type}`}
              content={DataControlEditorStrings.manageControl.dataSource.getControlTypeErrorMessage(
                {
                  fieldSelected: Boolean(dataViewId && fieldName),
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
  isPinned,
}: ControlEditorProps<State>) => {
  const controlActionRegistry = useControlActionRegistry();

  const [editorState, setEditorState] = useState<Partial<State>>(initialState);
  const [defaultPanelTitle, setDefaultPanelTitle] = useState<string>(
    initialDefaultPanelTitle ?? initialState.fieldName ?? ''
  );
  const [panelTitle, setPanelTitle] = useState<string>(initialState.title ?? defaultPanelTitle);
  const [selectedControlType, setSelectedControlType] = useState<string | undefined>(controlType);
  const [controlOptionsValid, setControlOptionsValid] = useState<boolean>(true);

  const editorConfig = useMemo<ControlGroupEditorConfig | undefined>(() => {
    return apiHasEditorConfig(parentApi) ? parentApi.getEditorConfig() : undefined;
  }, [parentApi]);

  const {
    loading: dataViewListLoading,
    value: dataViewListItems = [],
    error: dataViewListError,
  } = useAsync(async () => {
    return dataViewsService.getIdsWithTitle();
  });

  const {
    loading: dataViewLoading,
    value: { selectedDataView } = {
      selectedDataView: undefined,
    },
    error: fieldListError,
  } = useAsync(async () => {
    if (!editorState.dataViewId) {
      return;
    }
    const dataView = await dataViewsService.get(editorState.dataViewId);
    return {
      selectedDataView: dataView,
    };
  }, [editorState.dataViewId]);

  const CustomSettingsComponent = useMemo(() => {
    if (!selectedControlType) return;
    const CustomSettings =
      controlActionRegistry[selectedControlType]?.extension?.CustomOptionsComponent;
    if (!CustomSettings || !selectedDataView || !editorState.fieldName) return;

    const field = editorState.fieldName
      ? selectedDataView?.getFieldByName(editorState.fieldName)
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
  }, [selectedDataView, initialState, editorState, controlActionRegistry, selectedControlType]);

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
          {!editorConfig?.hideDataViewSelector && (
            <EuiFormRow
              data-test-subj="control-editor-data-view-picker"
              label={DataControlEditorStrings.manageControl.dataSource.getDataViewTitle()}
            >
              {dataViewListError ? (
                <EuiCallOut
                  announceOnMount
                  color="danger"
                  iconType="error"
                  title={DataControlEditorStrings.manageControl.dataSource.getDataViewListErrorTitle()}
                >
                  <p>{dataViewListError.message}</p>
                </EuiCallOut>
              ) : (
                <DataViewPicker
                  dataViews={dataViewListItems}
                  selectedDataViewId={editorState.dataViewId}
                  onChangeDataViewId={(newDataViewId) => {
                    setEditorState({ ...editorState, dataViewId: newDataViewId });
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
              <EuiCallOut
                announceOnMount
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
                  return (
                    (Object.values(controlActionRegistry) ?? []).some((action) =>
                      action.extension?.isFieldCompatible(field)
                    ) && customPredicate
                  );
                }}
                selectedFieldName={editorState.fieldName}
                dataView={selectedDataView}
                onSelectField={(field) => {
                  setEditorState({ ...editorState, fieldName: field.name });

                  /**
                   * make sure that the new field is compatible with the selected control type and, if it's not,
                   * reset the selected control type to the **first** compatible control type
                   */
                  if (
                    !selectedControlType ||
                    !controlActionRegistry[selectedControlType!]?.extension?.isFieldCompatible(
                      field
                    )
                  ) {
                    const firstCompatible = (() => {
                      for (const action of Object.values(controlActionRegistry)) {
                        if (action.extension?.isFieldCompatible(field)) return action;
                      }
                      return undefined;
                    })();
                    if (firstCompatible) setSelectedControlType(firstCompatible.type);
                  }

                  /**
                   * set the control title (i.e. the one set by the user) + default title (i.e. the field display name)
                   */
                  const newDefaultTitle = field.displayName ?? field.name;
                  setDefaultPanelTitle(newDefaultTitle);
                  const currentTitle = editorState.title;
                  if (!currentTitle || currentTitle === newDefaultTitle) {
                    setPanelTitle(newDefaultTitle);
                  }

                  setControlOptionsValid(true); // reset options state
                }}
                selectableProps={{ isLoading: dataViewListLoading || dataViewLoading }}
              />
            )}
          </EuiFormRow>
          <EuiFormRow
            label={DataControlEditorStrings.manageControl.dataSource.getControlTypeTitle()}
          >
            {/* wrapping in `div` so that focus gets passed properly to the form row */}
            <div>
              <CompatibleControlTypesComponent
                dataViewId={editorState.dataViewId}
                fieldName={editorState.fieldName}
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
            <EuiButton
              aria-label={`save-${editorState.title ?? editorState.fieldName}`}
              data-test-subj="control-editor-save"
              fill
              color="primary"
              disabled={!(controlOptionsValid && Boolean(selectedControlType))}
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
                      isPinned,
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
                onSave(editorState.dataViewId);
              }}
            >
              {DataControlEditorStrings.manageControl.getSaveChangesTitle()}
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </>
  );
};
