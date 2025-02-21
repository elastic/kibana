/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { DataView } from '@kbn/data-views-plugin/common';
import { ReactEmbeddableFactory } from '@kbn/embeddable-plugin/public';
import { ESQLControlVariable } from '@kbn/esql-validation-autocomplete';
import { PublishesESQLVariable, apiPublishesESQLVariable } from '@kbn/esql-variables-types';
import { i18n } from '@kbn/i18n';
import {
  apiHasSaveNotification,
  combineCompatibleChildrenApis,
} from '@kbn/presentation-containers';
import {
  PublishesDataViews,
  apiPublishesDataViews,
  useBatchedPublishingSubjects,
} from '@kbn/presentation-publishing';
import { apiPublishesReload } from '@kbn/presentation-publishing/interfaces/fetch/publishes_reload';
import fastIsEqual from 'fast-deep-equal';
import React, { useEffect } from 'react';
import { BehaviorSubject } from 'rxjs';
import type {
  ControlGroupChainingSystem,
  ControlGroupRuntimeState,
  ControlGroupSerializedState,
  ControlLabelPosition,
  ControlPanelsState,
  ParentIgnoreSettings,
} from '../../common';
import {
  CONTROL_GROUP_TYPE,
  DEFAULT_CONTROL_CHAINING,
  DEFAULT_CONTROL_LABEL_POSITION,
} from '../../common';
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

export const getControlGroupEmbeddableFactory = () => {
  const controlGroupEmbeddableFactory: ReactEmbeddableFactory<
    ControlGroupSerializedState,
    ControlGroupRuntimeState,
    ControlGroupApi
  > = {
    type: CONTROL_GROUP_TYPE,
    deserializeState: (state) => deserializeControlGroup(state),
    buildEmbeddable: async (
      initialRuntimeState,
      buildApi,
      uuid,
      parentApi,
      setApi,
      lastSavedRuntimeState
    ) => {
      const {
        labelPosition: initialLabelPosition,
        chainingSystem,
        autoApplySelections,
        ignoreParentSettings,
      } = initialRuntimeState;

      const autoApplySelections$ = new BehaviorSubject<boolean>(autoApplySelections);
      const defaultDataViewId = await dataViewsService.getDefaultId();
      const lastSavedControlsState$ = new BehaviorSubject<ControlPanelsState>(
        lastSavedRuntimeState.initialChildControlState
      );
      const controlsManager = initControlsManager(
        initialRuntimeState.initialChildControlState,
        lastSavedControlsState$
      );
      const selectionsManager = initSelectionsManager({
        ...controlsManager.api,
        autoApplySelections$,
      });
      const esqlVariables$ = new BehaviorSubject<ESQLControlVariable[]>([]);
      const dataViews$ = new BehaviorSubject<DataView[] | undefined>(undefined);
      const chainingSystem$ = new BehaviorSubject<ControlGroupChainingSystem>(
        chainingSystem ?? DEFAULT_CONTROL_CHAINING
      );
      const ignoreParentSettings$ = new BehaviorSubject<ParentIgnoreSettings | undefined>(
        ignoreParentSettings
      );
      const labelPosition$ = new BehaviorSubject<ControlLabelPosition>(
        initialLabelPosition ?? DEFAULT_CONTROL_LABEL_POSITION
      );
      const allowExpensiveQueries$ = new BehaviorSubject<boolean>(true);
      const disabledActionIds$ = new BehaviorSubject<string[] | undefined>(undefined);

      const unsavedChanges = initializeControlGroupUnsavedChanges(
        selectionsManager.applySelections,
        controlsManager.api.children$,
        {
          ...controlsManager.comparators,
          autoApplySelections: [
            autoApplySelections$,
            (next: boolean) => autoApplySelections$.next(next),
          ],
          chainingSystem: [
            chainingSystem$,
            (next: ControlGroupChainingSystem) => chainingSystem$.next(next),
            (a, b) => (a ?? DEFAULT_CONTROL_CHAINING) === (b ?? DEFAULT_CONTROL_CHAINING),
          ],
          ignoreParentSettings: [
            ignoreParentSettings$,
            (next: ParentIgnoreSettings | undefined) => ignoreParentSettings$.next(next),
            fastIsEqual,
          ],
          labelPosition: [
            labelPosition$,
            (next: ControlLabelPosition) => labelPosition$.next(next),
          ],
        },
        controlsManager.snapshotControlsRuntimeState,
        controlsManager.resetControlsUnsavedChanges,
        parentApi,
        lastSavedRuntimeState
      );

      const api = setApi({
        ...controlsManager.api,
        esqlVariables$,
        disabledActionIds$,
        ...unsavedChanges.api,
        ...selectionsManager.api,
        controlFetch$: (controlUuid: string) =>
          controlFetch$(
            chaining$(
              controlUuid,
              chainingSystem$,
              controlsManager.controlsInOrder$,
              controlsManager.api.children$
            ),
            controlGroupFetch$(ignoreParentSettings$, parentApi ? parentApi : {})
          ),
        ignoreParentSettings$,
        autoApplySelections$,
        allowExpensiveQueries$,
        snapshotRuntimeState: () => {
          return {
            chainingSystem: chainingSystem$.getValue(),
            labelPosition: labelPosition$.getValue(),
            autoApplySelections: autoApplySelections$.getValue(),
            ignoreParentSettings: ignoreParentSettings$.getValue(),
            initialChildControlState: controlsManager.snapshotControlsRuntimeState(),
          };
        },
        onEdit: async () => {
          openEditControlGroupFlyout(api, {
            chainingSystem: chainingSystem$,
            labelPosition: labelPosition$,
            autoApplySelections: autoApplySelections$,
            ignoreParentSettings: ignoreParentSettings$,
          });
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
            onSave: ({ type: controlType, state: initialState }) => {
              controlsManager.api.addNewPanel({
                panelType: controlType,
                initialState: settings?.controlStateTransform
                  ? settings.controlStateTransform(initialState, controlType)
                  : initialState,
              });
              settings?.onSave?.();
            },
            controlGroupApi: api,
          });
        },
        serializeState: () => {
          const { controls, references } = controlsManager.serializeControls();
          return {
            rawState: {
              chainingSystem: chainingSystem$.getValue(),
              labelPosition: labelPosition$.getValue(),
              autoApplySelections: autoApplySelections$.getValue(),
              ignoreParentSettings: ignoreParentSettings$.getValue(),
              controls,
            },
            references,
          };
        },
        dataViews$,
        labelPosition: labelPosition$,
        saveNotification$: apiHasSaveNotification(parentApi)
          ? parentApi.saveNotification$
          : undefined,
        reload$: apiPublishesReload(parentApi) ? parentApi.reload$ : undefined,

        /** Public getters */
        getTypeDisplayName: () =>
          i18n.translate('controls.controlGroup.displayName', {
            defaultMessage: 'Controls',
          }),
        getEditorConfig: () => initialRuntimeState.editorConfig,
        getLastSavedControlState: (controlUuid: string) => {
          return lastSavedRuntimeState.initialChildControlState[controlUuid] ?? {};
        },

        /** Public setters */
        setDisabledActionIds: (ids) => disabledActionIds$.next(ids),
        setChainingSystem: (newChainingSystem) => chainingSystem$.next(newChainingSystem),
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

      const saveNotificationSubscription = apiHasSaveNotification(parentApi)
        ? parentApi.saveNotification$.subscribe(() => {
            lastSavedControlsState$.next(controlsManager.snapshotControlsRuntimeState());

            if (
              typeof autoApplySelections$.value === 'boolean' &&
              !autoApplySelections$.value &&
              selectionsManager.hasUnappliedSelections$.value
            ) {
              selectionsManager.applySelections();
            }
          })
        : undefined;

      return {
        api,
        Component: () => {
          const [hasUnappliedSelections, labelPosition] = useBatchedPublishingSubjects(
            selectionsManager.hasUnappliedSelections$,
            labelPosition$
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
              saveNotificationSubscription?.unsubscribe();
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
