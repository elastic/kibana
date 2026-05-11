/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { pick } from 'lodash';
import deepEqual from 'fast-deep-equal';
import React, { useEffect } from 'react';
import { BehaviorSubject, combineLatest, distinctUntilChanged, map } from 'rxjs';

import { ESQL_CONTROL } from '@kbn/controls-constants';
import type { OptionsListESQLControlState } from '@kbn/controls-schemas';
import type { EmbeddableFactory } from '@kbn/embeddable-plugin/public';
import {
  apiPublishesESQLVariables,
  isStaticESQLControl,
  type QueryESQLControl,
  type StaticESQLControl,
} from '@kbn/esql-types';
import { getESQLQueryVariables } from '@kbn/esql-utils';
import {
  apiHasPinnedPanels,
  apiPublishesChildren,
  apiPublishesESQLQuery,
  initializeUnsavedChanges,
  type HasUniqueId,
  type StateComparators,
} from '@kbn/presentation-publishing';

import { uiActionsService } from '../../services/kibana_services';
import { defaultControlLabelComparators, initializeLabelManager } from '../control_labels';
import { OptionsListControl } from '../data_controls/options_list_control/components/options_list_control';
import { OptionsListControlContext } from '../data_controls/options_list_control/options_list_context_provider';
import { VariableControlsStrings } from './constants';
import { getSelectionComparators, initializeESQLControlManager } from './esql_control_manager';
import {
  type ESQLControlApi,
  type ESQLOptionsListComponentApi,
  type ESQLOptionsListRuntimeState,
} from './types';
import { getTooltipTitle } from './utils/get_tooltip_title';

export const getESQLControlFactory = <
  State extends OptionsListESQLControlState = OptionsListESQLControlState
>(): EmbeddableFactory<
  State extends { control_type: 'STATIC_VALUES' } ? StaticESQLControl : QueryESQLControl,
  ESQLControlApi<State>
> => {
  return {
    type: ESQL_CONTROL,
    buildEmbeddable: async ({ initialState, finalizeApi, uuid, parentApi }) => {
      const state = initialState;

      const dataLoading$ = new BehaviorSubject<boolean | undefined>(false);
      const setDataLoading = (loading: boolean | undefined) => dataLoading$.next(loading);

      const selections = initializeESQLControlManager(uuid, parentApi, state, setDataLoading);
      const labelManager = initializeLabelManager(
        { title: initialState.title, variableName: initialState.variable_name },
        selections.internalApi,
        'variableName'
      );

      const tooltipLabel$ = new BehaviorSubject<string>(state.title ?? '');
      const tooltipLabelSubscription = combineLatest([
        selections.api.esqlVariable$,
        labelManager.api.label$,
      ])
        .pipe(
          map(([{ key: variableName, type: variableType }, label]) => {
            return getTooltipTitle(variableName, variableType, label);
          })
        )
        .subscribe((next) => tooltipLabel$.next(next));

      function serializeState() {
        return {
          ...selections.getLatestState(),
          ...labelManager.getLatestState(),
        } as typeof initialState;
      }

      const unsavedChangesApi = initializeUnsavedChanges<typeof initialState>({
        uuid,
        parentApi,
        serializeState,
        anyStateChange$: selections.anyStateChange$,
        getComparators: () => {
          return {
            ...getSelectionComparators(state.control_type),
            ...defaultControlLabelComparators,
            display_settings: 'skip',
          } as StateComparators<typeof initialState>;
        },
        onReset: (lastSaved) => {
          selections.reinitializeState({
            available_options: [],
            ...lastSaved,
          } as ESQLOptionsListRuntimeState);
          labelManager.reinitializeState(lastSaved);
        },
      });

      const relatedPanels$ = new BehaviorSubject<string[]>([]);
      const relatedPanelsSubscription = apiPublishesChildren(parentApi)
        ? parentApi.children$
            .pipe(
              map(
                (children) =>
                  Object.values(children)
                    .filter(
                      (child) =>
                        (child as HasUniqueId).uuid !== uuid &&
                        apiPublishesESQLQuery(child) &&
                        getESQLQueryVariables(child.query$.getValue().esql).includes(
                          initialState.variable_name
                        )
                    )
                    .map((child) => (child as HasUniqueId).uuid),
                distinctUntilChanged(deepEqual)
              )
            )
            .subscribe((children) => {
              relatedPanels$.next(children);
            })
        : null;

      const api = finalizeApi({
        relatedPanels$,
        ...unsavedChangesApi,
        ...selections.api,
        ...labelManager.api,
        dataLoading$,
        isExpandable: false,
        isCustomizable: false,
        /**
         * TODO: Remove isDuplicable: false once duplicating ES|QL controls has been implemented
         * ES|QL controls can only output unique variable names, so in order to duplicate the control,
         * we would need to add a number or other uniquifying character to the end of the variable name.
         * The problem with this is that the user cannot edit variable names after the control is created.
         * Once we come up with a good UX solution to this, we can remove this
         */
        isDuplicable: false,
        isPinnable: true,
        tooltipLabel$,
        isEditingEnabled: () => true,
        getTypeDisplayName: () => VariableControlsStrings.displayName,
        onEdit: async () => {
          const nextState = {
            ...selections.getLatestState(),
            ...labelManager.getLatestState(),
          };
          const variablesInParent = apiPublishesESQLVariables(api.parentApi)
            ? api.parentApi.esqlVariables$.value
            : [];
          const onSaveControl = async (updatedState: ESQLOptionsListRuntimeState) => {
            selections.reinitializeState(updatedState);
            labelManager.reinitializeState(updatedState);
          };
          try {
            await uiActionsService.executeTriggerActions('ESQL_CONTROL_TRIGGER', {
              queryString: isStaticESQLControl(nextState) ? '' : nextState.esql_query,
              variableType: nextState.variable_type,
              controlType: nextState.control_type,
              esqlVariables: variablesInParent,
              onSaveControl,
              parentApi,
              initialState: nextState,
              controlId: uuid,
            });
          } catch (e) {
            // eslint-disable-next-line no-console
            console.error('Error getting ESQL control trigger', e);
          }
        },
        serializeState,
      }) as ESQLControlApi<State>;

      const componentApi: ESQLOptionsListComponentApi = {
        ...pick(api, [
          'dataLoading$',
          'label$',
          'type',
          'parentApi',
          'tooltipLabel$',
          'relatedPanels$',
        ]),
        ...selections.internalApi,
        uuid,
        setDataLoading,

        makeSelection(key?: string) {
          if (!key) return;
          const singleSelect = selections.api.singleSelect$.value;
          if (singleSelect) {
            selections.internalApi.setSelectedOptions([key]);
          } else {
            // Get current selection state, not initial state
            const current = componentApi.selectedOptions$.value || [];
            const isSelected = current.includes(key);
            // Don't allow empty selections until "ANY" value is supported: https://github.com/elastic/elasticsearch/issues/136735
            if (isSelected && current.length === 1) {
              return;
            }
            const newSelection = isSelected ? current.filter((k) => k !== key) : [...current, key];
            selections.internalApi.setSelectedOptions(newSelection);
          }
        },
        // Pass no-ops and default values for all of the features of OptionsList that ES|QL controls don't currently use
        singleSelect$: selections.api.singleSelect$,
        invalidSelections$: selections.internalApi.invalidSelections$,
        deselectOption: (key?: string) => {
          const incompatibleSelections = selections.internalApi.invalidSelections$.value;
          const isIncompatible = key ? incompatibleSelections.has(key) : false;
          if (isIncompatible) {
            // remove from incompatible selections
            const newIncompatibleSelections = new Set(incompatibleSelections);
            newIncompatibleSelections.delete(key!);
            selections.internalApi.setInvalidSelections(newIncompatibleSelections);

            // remove from selected options
            const currentSelected = componentApi.selectedOptions$.value || [];
            const newSelected = currentSelected.filter((option) => option !== key);
            selections.internalApi.setSelectedOptions(newSelected);
          }
        },
        selectAll: (keys: string[]) => {
          selections.internalApi.setSelectedOptions(keys);
        },
        deselectAll: () => {
          // Don't allow empty selections until "ANY" value is supported: https://github.com/elastic/elasticsearch/issues/136735
        },
      };

      const isPinned = apiHasPinnedPanels(parentApi) ? parentApi.panelIsPinned(uuid) : false;

      return {
        api,
        Component: () => {
          useEffect(() => {
            return () => {
              selections.cleanup();
              labelManager.cleanup();
              tooltipLabelSubscription.unsubscribe();
              relatedPanelsSubscription?.unsubscribe();
            };
          }, []);

          return (
            <OptionsListControlContext.Provider
              value={{
                componentApi,
                displaySettings: {
                  hide_action_bar: false,
                  hide_exclude: true,
                  hide_exists: true,
                  hide_sort: true,
                  placeholder: VariableControlsStrings.emptySelectionPlaceholder,
                },
                customStrings: {
                  invalidSelectionsLabel: VariableControlsStrings.getIncompatibleSelectionsLabel(
                    componentApi.invalidSelections$.value.size
                  ),
                },
              }}
            >
              <OptionsListControl
                // Don't allow empty selections until "ANY" value is supported: https://github.com/elastic/elasticsearch/issues/136735
                disableMultiValueEmptySelection={true}
                isPinned={isPinned}
              />
            </OptionsListControlContext.Provider>
          );
        },
      };
    },
  };
};
