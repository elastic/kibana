/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useEffect } from 'react';
import { BehaviorSubject } from 'rxjs';
import { pick } from 'lodash';

import { ESQL_CONTROL } from '@kbn/controls-constants';
import type { EmbeddableFactory } from '@kbn/embeddable-plugin/public';
import { apiPublishesESQLVariables } from '@kbn/esql-types';
import { apiHasPinnedPanels, initializeUnsavedChanges } from '@kbn/presentation-publishing';
import type { OptionsListESQLControlState } from '@kbn/controls-schemas';

import { uiActionsService } from '../../services/kibana_services';
import { OptionsListControl } from '../data_controls/options_list_control/components/options_list_control';
import { OptionsListControlContext } from '../data_controls/options_list_control/options_list_context_provider';
import { initializeESQLControlManager, selectionComparators } from './esql_control_manager';
import type { ESQLControlApi, ESQLOptionsListComponentApi } from './types';
import { VariableControlsStrings } from './constants';
import { initializeLabelManager, defaultControlLabelComparators } from '../control_labels';

export const getESQLControlFactory = (): EmbeddableFactory<
  OptionsListESQLControlState,
  ESQLControlApi
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

      function serializeState() {
        return {
          ...selections.getLatestState(),
          ...labelManager.getLatestState(),
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
            ...defaultControlLabelComparators,
            display_settings: 'skip',
          };
        },
        onReset: (lastSaved) => {
          selections.reinitializeState(lastSaved);
          labelManager.reinitializeState(lastSaved);
        },
      });

      const api: ESQLControlApi = finalizeApi({
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
          const onSaveControl = async (updatedState: OptionsListESQLControlState) => {
            selections.reinitializeState(updatedState);
            labelManager.reinitializeState(updatedState);
          };
          try {
            await uiActionsService.executeTriggerActions('ESQL_CONTROL_TRIGGER', {
              queryString: nextState.esql_query,
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
      });

      const componentApi: ESQLOptionsListComponentApi = {
        ...pick(api, ['dataLoading$', 'label$', 'type']),
        ...selections.internalApi,
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
