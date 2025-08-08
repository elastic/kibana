/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { DataView } from '@kbn/data-views-plugin/common';
import { EmbeddableFactory } from '@kbn/embeddable-plugin/public';
import type { ESQLControlVariable } from '@kbn/esql-types';
import { PublishesESQLVariable, apiPublishesESQLVariable } from '@kbn/esql-types';
import { i18n } from '@kbn/i18n';
import { combineCompatibleChildrenApis } from '@kbn/presentation-containers';
import {
  PublishesDataViews,
  apiPublishesDataViews,
  useBatchedPublishingSubjects,
} from '@kbn/presentation-publishing';
import { apiPublishesReload } from '@kbn/presentation-publishing/interfaces/fetch/publishes_reload';
import React, { useEffect } from 'react';
import { BehaviorSubject } from 'rxjs';
import type { ControlsGroupState } from '@kbn/controls-schemas';
import { CONTROLS_GROUP_TYPE } from '@kbn/controls-constants';
import { openDataControlEditor } from '../controls/data_controls/open_data_control_editor';
import { coreServices, dataViewsService } from '../services/kibana_services';
import { ControlGroup } from './components/control_group';
import { chaining$, controlFetch$, controlGroupFetch$ } from './control_fetch';
import { initializeControlGroupUnsavedChanges } from './control_group_unsaved_changes_api';
import { initControlsManager } from './init_controls_manager';
import { openEditControlGroupFlyout } from './open_edit_control_group_flyout';
import { initSelectionsManager } from './selections_manager';
import type { ControlGroupApi } from './types';
import { deserializeControlGroup } from './utils/serialization_utils';
import { initializeEditorStateManager } from './initialize_editor_state_manager';

export const getControlGroupEmbeddableFactory = () => {
  const controlGroupEmbeddableFactory: EmbeddableFactory<ControlsGroupState, ControlGroupApi> = {
    type: CONTROLS_GROUP_TYPE,
    buildEmbeddable: async ({ initialState, finalizeApi, uuid, parentApi }) => {
      const initialRuntimeState = deserializeControlGroup(initialState);

      const editorStateManager = initializeEditorStateManager(initialState?.rawState);

      const defaultDataViewId = await dataViewsService.getDefaultId();

      const controlsManager = initControlsManager(initialRuntimeState.initialChildControlState);
      const selectionsManager = initSelectionsManager({
        ...controlsManager.api,
        autoApplySelections$: editorStateManager.api.autoApplySelections$,
      });
      const esqlVariables$ = new BehaviorSubject<ESQLControlVariable[]>([]);
      const dataViews$ = new BehaviorSubject<DataView[] | undefined>(undefined);

      const allowExpensiveQueries$ = new BehaviorSubject<boolean>(true);
      const disabledActionIds$ = new BehaviorSubject<string[] | undefined>(undefined);

      function serializeState() {
        const { controls, references } = controlsManager.serializeControls();
        return {
          rawState: {
            ...editorStateManager.getLatestState(),
            controls,
          },
          references,
        };
      }

      const unsavedChanges = initializeControlGroupUnsavedChanges({
        applySelections: selectionsManager.applySelections,
        children$: controlsManager.api.children$,
        controlGroupId: uuid,
        editorStateManager,
        layout$: controlsManager.controlsInOrder$,
        parentApi,
        resetControlsUnsavedChanges: controlsManager.resetControlsUnsavedChanges,
        serializeControlGroupState: serializeState,
      });

      const api = finalizeApi({
        ...controlsManager.api,
        esqlVariables$,
        disabledActionIds$,
        ...unsavedChanges.api,
        ...selectionsManager.api,
        controlFetch$: (controlUuid: string, onReload?: () => void) =>
          controlFetch$(
            chaining$(
              controlUuid,
              editorStateManager.api.chainingSystem$,
              controlsManager.controlsInOrder$,
              controlsManager.api.children$
            ),
            controlGroupFetch$(
              editorStateManager.api.ignoreParentSettings$,
              parentApi ? parentApi : {},
              onReload
            )
          ),
        ignoreParentSettings$: editorStateManager.api.ignoreParentSettings$,
        autoApplySelections$: editorStateManager.api.autoApplySelections$,
        allowExpensiveQueries$,
        onEdit: async () => {
          openEditControlGroupFlyout(api, editorStateManager);
        },
        isEditingEnabled: () => true,
        openAddDataControlFlyout: (settings) => {
          const parentDataViewId = apiPublishesDataViews(parentApi)
            ? parentApi.dataViews$.value?.[0]?.id
            : undefined;
          const newControlState = controlsManager.getNewControlState();

          openDataControlEditor({
            initialState: {
              ...newControlState,
              dataViewId:
                newControlState.dataViewId ?? parentDataViewId ?? defaultDataViewId ?? undefined,
            },
            onSave: ({ type: controlType, state: onSaveState }) => {
              controlsManager.api.addNewPanel({
                panelType: controlType,
                serializedState: {
                  rawState: settings?.controlStateTransform
                    ? settings.controlStateTransform(onSaveState, controlType)
                    : onSaveState,
                },
              });
              settings?.onSave?.();
            },
            controlGroupApi: api,
          });
        },
        serializeState,
        dataViews$,
        labelPosition: editorStateManager.api.labelPosition$,
        reload$: apiPublishesReload(parentApi) ? parentApi.reload$ : undefined,

        /** Public getters */
        getTypeDisplayName: () =>
          i18n.translate('controls.controlGroup.displayName', {
            defaultMessage: 'Controls',
          }),
        getEditorConfig: () => initialRuntimeState.editorConfig,

        /** Public setters */
        setDisabledActionIds: (ids) => disabledActionIds$.next(ids),
        setChainingSystem: editorStateManager.api.setChainingSystem,
      });

      /** Subscribe to all children's output data views, combine them, and output them */
      const childrenDataViewsSubscription = combineCompatibleChildrenApis<
        PublishesDataViews,
        DataView[]
      >(api, 'dataViews$', apiPublishesDataViews, []).subscribe((newDataViews) =>
        dataViews$.next(newDataViews)
      );

      /** Combine ESQL variables from all children that publish them. */
      const childrenESQLVariablesSubscription = combineCompatibleChildrenApis<
        PublishesESQLVariable,
        ESQLControlVariable[]
      >(api, 'esqlVariable$', apiPublishesESQLVariable, []).subscribe((newESQLVariables) => {
        esqlVariables$.next(newESQLVariables);
      });

      return {
        api,
        Component: () => {
          const [hasUnappliedSelections, labelPosition] = useBatchedPublishingSubjects(
            selectionsManager.hasUnappliedSelections$,
            editorStateManager.api.labelPosition$
          );

          useEffect(() => {
            /** Fetch the allowExpensiveQuries setting for the children to use if necessary */
            const fetchAllowExpensiveQueries = async () => {
              try {
                const { allowExpensiveQueries } = await coreServices.http.get<{
                  allowExpensiveQueries: boolean;
                }>('/internal/controls/getExpensiveQueriesSetting', {
                  version: '1',
                });
                if (!allowExpensiveQueries) {
                  // only set if this returns false, since it defaults to true
                  allowExpensiveQueries$.next(allowExpensiveQueries);
                }
              } catch {
                // do nothing - default to true on error (which it was initialized to)
              }
            };
            fetchAllowExpensiveQueries(); // no need to await - don't want to block anything waiting for this

            return () => {
              selectionsManager.cleanup();
              childrenDataViewsSubscription.unsubscribe();
              childrenESQLVariablesSubscription.unsubscribe();
            };
          }, []);

          return (
            <ControlGroup
              applySelections={selectionsManager.applySelections}
              controlGroupApi={api}
              controlsManager={controlsManager}
              hasUnappliedSelections={hasUnappliedSelections}
              labelPosition={labelPosition}
            />
          );
        },
      };
    },
  };

  return controlGroupEmbeddableFactory;
};
