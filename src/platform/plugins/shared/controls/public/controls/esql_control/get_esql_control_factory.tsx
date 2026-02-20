/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { BehaviorSubject } from 'rxjs';

import { ESQL_CONTROL } from '@kbn/controls-constants';
import type { EmbeddableFactory } from '@kbn/embeddable-plugin/public';
import { apiPublishesESQLVariables } from '@kbn/esql-types';
import {
  type PublishingSubject,
  initializeStateManager,
  initializeUnsavedChanges,
  initializeTitleManager,
  titleComparators,
} from '@kbn/presentation-publishing';
import type { OptionsListESQLControlState, OptionsListSelection } from '@kbn/controls-schemas';

import { uiActionsService } from '../../services/kibana_services';
import { OptionsListControl } from '../data_controls/options_list_control/components/options_list_control';
import { OptionsListControlContext } from '../data_controls/options_list_control/options_list_context_provider';
import type { OptionsListComponentApi } from '../data_controls/options_list_control/types';
import { initializeESQLControlManager, selectionComparators } from './esql_control_manager';
import type { ESQLControlApi, OptionsListESQLUnusedState } from './types';
import { VariableControlsStrings } from './constants';

export const getESQLControlFactory = (): EmbeddableFactory<
  OptionsListESQLControlState,
  ESQLControlApi
> => {
  return {
    type: ESQL_CONTROL,
    buildEmbeddable: async ({ initialState, finalizeApi, uuid, parentApi }) => {
      const state = initialState;
      const titlesManager = initializeTitleManager(state);

      const dataLoading$ = new BehaviorSubject<boolean | undefined>(false);
      const setDataLoading = (loading: boolean | undefined) => dataLoading$.next(loading);

      const selections = initializeESQLControlManager(uuid, parentApi, state, setDataLoading);

      function serializeState() {
        return {
          ...selections.getLatestState(),
        };
      }

      const unsavedChangesApi = initializeUnsavedChanges<OptionsListESQLControlState>({
        uuid,
        parentApi,
        serializeState,
        anyStateChange$: selections.anyStateChange$,
        getComparators: () => {
          return {
            ...selectionComparators,
            ...titleComparators,
            display_settings: 'skip',
          };
        },
        onReset: (lastSaved) => {
          selections.reinitializeState(lastSaved);
          titlesManager.reinitializeState(lastSaved);
        },
      });

      const api = finalizeApi({
        ...titlesManager.api,
        ...unsavedChangesApi,
        ...selections.api,
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
        defaultTitle$: new BehaviorSubject<string | undefined>(state.title),
        isEditingEnabled: () => true,
        getTypeDisplayName: () => VariableControlsStrings.displayName,
        onEdit: async () => {
          const nextState = {
            ...titlesManager.getLatestState(),
            ...selections.getLatestState(),
          };
          const variablesInParent = apiPublishesESQLVariables(api.parentApi)
            ? api.parentApi.esqlVariables$.value
            : [];
          const onSaveControl = async (updatedState: OptionsListESQLControlState) => {
            selections.reinitializeState(updatedState);
            titlesManager.reinitializeState(updatedState);
          };
          try {
            await uiActionsService.executeTriggerActions('ESQL_CONTROL_TRIGGER', {
              queryString: nextState.esql_query,
              variableType: nextState.variable_type,
              controlType: nextState.control_type,
              esqlVariables: variablesInParent,
              onSaveControl,
              initialState: nextState,
            });
          } catch (e) {
            // eslint-disable-next-line no-console
            console.error('Error getting ESQL control trigger', e);
          }
        },
        serializeState,
      });

      const componentStaticState = {
        single_select: state.single_select ?? true,
        exclude: false,
        exists_selected: false,
        requestSize: 0,
        sort: undefined,
        run_past_timeout: false,
        invalidSelections: new Set<OptionsListSelection>(),
        field_name: state.variable_name,
        use_global_filters: false,
        ignore_validations: false,
        data_view_id: '',
        blockingError: undefined,
        filtersLoading: false,
        appliedFilters: undefined,
        dataViews: undefined,
      };
      // Generate a state manager for all the props this control isn't expected to use, so the getters and setters are available
      const componentStaticStateManager = initializeStateManager<OptionsListESQLUnusedState>(
        componentStaticState,
        componentStaticState
      );

      const componentApi: OptionsListComponentApi = {
        ...api,
        ...selections.internalApi,
        isExpandable: false,
        isCustomizable: false,
        isDuplicable: false,
        isPinnable: true,
        uuid,
        setDataLoading,
        makeSelection(key?: string) {
          const singleSelect = selections.api.singleSelect$.value ?? true;
          if (singleSelect && key) {
            selections.internalApi.setSelectedOptions([key]);
          } else if (key) {
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
        ...componentStaticStateManager.api,
        singleSelect$: selections.api.singleSelect$ as PublishingSubject<boolean | undefined>,
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
        loadMoreSubject: new BehaviorSubject<void>(undefined),
        fieldFormatter: new BehaviorSubject((v: string) => v),
        allowExpensiveQueries$: new BehaviorSubject<boolean>(true),
        dataViews$: new BehaviorSubject(undefined) as OptionsListComponentApi['dataViews$'],
      };

      return {
        api,
        Component: () => (
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
            />
          </OptionsListControlContext.Provider>
        ),
      };
    },
  };
};
