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
} from '@elastic/eui';
import { DEFAULT_CONTROL_GROW, DEFAULT_CONTROL_WIDTH } from '@kbn/controls-constants';
import type { ControlWidth } from '@kbn/controls-schemas';
import { apiIsPresentationContainer } from '@kbn/presentation-containers';
import {
  LazyDataViewPicker,
  LazyFieldPicker,
  withSuspense,
} from '@kbn/presentation-util-plugin/public';
import { asyncForEach } from '@kbn/std';

import type { DefaultDataControlState } from '../../../common';
import {
  CONTROL_MENU_TRIGGER,
  ControlTypeAction,
  addControlMenuTrigger,
} from '../../actions/control_panel_actions';
import { confirmDeleteControl } from '../../common';
import { dataViewsService, uiActionsService } from '../../services/kibana_services';
import { DataControlEditorStrings } from './data_control_constants';
import { CONTROL_WIDTH_OPTIONS } from './editor_constants';

export interface ControlEditorProps<
  State extends DefaultDataControlState = DefaultDataControlState
> {
  initialState: Partial<State>;
  controlType?: string;
  controlId?: string;
  initialDefaultPanelTitle?: string;
  parentApi: unknown;
  onCancel: (newState: Partial<State>) => void;
  onSave: () => void;
  ariaLabelledBy: string;
}

const FieldPicker = withSuspense(LazyFieldPicker, null);
const DataViewPicker = withSuspense(LazyDataViewPicker, null);

const CompatibleControlTypesComponent = ({
  dataViewId,
  fieldName,
  selectedAction,
  setSelectedAction,
}: Partial<DefaultDataControlState> & {
  selectedAction?: ControlTypeAction;
  setSelectedAction: (action: ControlTypeAction) => void;
}) => {
  const [controlTypes, setControlTypes] = useState<ControlTypeAction[] | undefined>(undefined);
  const [isCompatible, setIsCompatible] = useState<{ [type: string]: boolean }>({});

  useEffect(() => {
    let cancelled = false;

    uiActionsService
      .getTriggerActions(CONTROL_MENU_TRIGGER)
      .then((controlTypeActions) => {
        if (!cancelled) {
          setControlTypes(
            controlTypeActions.sort(
              (
                { order: orderA = 0, getDisplayName: getDisplayNameA },
                { order: orderB = 0, getDisplayName: getDisplayNameB }
              ) => {
                const orderComparison = orderB - orderA; // sort descending by order
                return orderComparison === 0
                  ? getDisplayNameA({ trigger: addControlMenuTrigger }).localeCompare(
                      getDisplayNameB({ trigger: addControlMenuTrigger })
                    ) // if equal order, compare display names
                  : orderComparison;
              }
            ) as ControlTypeAction[]
          );
        }
      })
      .catch(() => {
        if (!cancelled) setControlTypes([]);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const controlTypeContext = useMemo(
    () => ({
      trigger: addControlMenuTrigger,
      embeddable: undefined, // parentApi isn't necessary for this
      state: { dataViewId, fieldName },
    }),
    [dataViewId, fieldName]
  );

  useEffect(() => {
    const asyncGetCompatibility = async () => {
      const compatibilityMap: { [type: string]: boolean } = {};
      await asyncForEach(controlTypes ?? [], async (action) => {
        const compatible = await action.isCompatible(controlTypeContext);
        compatibilityMap[action.id] = compatible;
      });
      setIsCompatible(compatibilityMap);
    };
    asyncGetCompatibility();
  }, [controlTypes, controlTypeContext]);

  return (
    <EuiSkeletonRectangle isLoading={controlTypes === undefined} width="100px" height="100px">
      <EuiKeyPadMenu data-test-subj={`controlTypeMenu`} aria-label={'type'}>
        {(controlTypes ?? []).map((action) => {
          const disabled = !isCompatible[action.id];
          const keyPadMenuItem = (
            <EuiKeyPadMenuItem
              key={action.type}
              id={`create__${action.type}`}
              aria-label={action.getDisplayName(controlTypeContext)}
              data-test-subj={`create__${action.type}`}
              isSelected={action.id === selectedAction?.id}
              disabled={disabled}
              onClick={() => setSelectedAction(action)}
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

export const DataControlEditor = <State extends DefaultDataControlState = DefaultDataControlState>({
  initialState,
  controlId,
  controlType,
  initialDefaultPanelTitle,
  onSave,
  onCancel,
  parentApi,
  ariaLabelledBy,
}: ControlEditorProps<State>) => {
  const [editorState, setEditorState] = useState<Partial<State>>(initialState);
  const [defaultPanelTitle, setDefaultPanelTitle] = useState<string>(
    initialDefaultPanelTitle ?? initialState.fieldName ?? ''
  );
  const [panelTitle, setPanelTitle] = useState<string>(initialState.title ?? defaultPanelTitle);
  const [selectedAction, setSelectedAction] = useState<ControlTypeAction | undefined>();
  const [controlOptionsValid, setControlOptionsValid] = useState<boolean>(true);

  // TODO get editor config from parent?
  const editorConfig = useMemo(
    () => ({ hideAdditionalSettings: false, hideWidthSettings: false }),
    []
  );

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
    // const registry = await getDataControlFieldRegistry(dataView);
    return {
      selectedDataView: dataView,
    };
  }, [editorState.dataViewId]);

  const CustomSettingsComponent = useMemo(() => {
    const CustomSettings = selectedAction?.MenuItem;
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
  }, [selectedDataView, selectedAction, initialState, editorState]);

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
                selectedDataViewId={editorState.dataViewId}
                onChangeDataViewId={(newDataViewId) => {
                  setEditorState({ ...editorState, dataViewId: newDataViewId });
                  setSelectedAction(undefined);
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
                // filterPredicate={(field: DataViewField) => {
                //   const customPredicate = editorConfig?.fieldFilterPredicate?.(field) ?? true;
                //   return Boolean(fieldRegistry?.[field.name]) && customPredicate;
                // }}
                selectedFieldName={editorState.fieldName}
                dataView={selectedDataView}
                onSelectField={(field) => {
                  setEditorState({ ...editorState, fieldName: field.name });

                  /**
                   * make sure that the new field is compatible with the selected control type and, if it's not,
                   * reset the selected control type to the **first** compatible control type
                   */
                  // const newCompatibleControlTypes =
                  //   fieldRegistry?.[field.name]?.compatibleControlTypes ?? [];
                  // if (
                  //   !selectedControlType ||
                  //   !newCompatibleControlTypes.includes(selectedControlType!)
                  // ) {
                  //   setSelectedControlType(newCompatibleControlTypes[0]);
                  // }

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
                selectedAction={selectedAction}
                setSelectedAction={setSelectedAction}
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
                        if (apiIsPresentationContainer(parentApi))
                          parentApi.removePanel(controlId!);
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
                disabled={!(controlOptionsValid && Boolean(selectedAction))}
                onClick={() => {
                  selectedAction?.execute({
                    trigger: addControlMenuTrigger,
                    embeddable: parentApi,
                    state: editorState,
                  });
                  onSave();
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
