/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { BehaviorSubject, merge } from 'rxjs';
import type { ESQLControlState } from '@kbn/esql-types';
import { apiPublishesESQLVariables } from '@kbn/esql-types';
import { initializeStateManager } from '@kbn/presentation-publishing';
import { initializeUnsavedChanges } from '@kbn/presentation-containers';
import { ESQL_CONTROL } from '@kbn/controls-constants';
import type { EmbeddableFactory } from '@kbn/embeddable-plugin/public';
import { omit } from 'lodash';
import type { OptionsListSelection } from '../../../common/options_list';
import type { ESQLControlApi, OptionsListESQLUnusedState } from './types';
import { uiActionsService } from '../../services/kibana_services';
import { initializeESQLControlSelections, selectionComparators } from './esql_control_selections';
import { OptionsListControlContext } from '../data_controls/options_list_control/options_list_context_provider';
import { OptionsListControl } from '../data_controls/options_list_control/components/options_list_control';
import type { OptionsListComponentApi } from '../data_controls/options_list_control/types';

const displayName = i18n.translate('controls.esqlValuesControl.displayName', {
  defaultMessage: 'Static values list',
});

export const getESQLControlFactory = (): EmbeddableFactory<ESQLControlState, ESQLControlApi> => {
  return {
    type: ESQL_CONTROL,
    buildEmbeddable: async ({ initialState, finalizeApi, uuid, parentApi }) => {
      const state = initialState.rawState;
      const defaultControlManager = await initializeDefaultControlManager({
        grow: state.grow,
        width: state.width,
      });

      // TODO Rename this; this is actually the state manager for all non-default control state params, "selections" is a confusing name
      const selections = initializeESQLControlSelections(
        { uuid, parentApi },
        state,
        defaultControlManager.api.setDataLoading
      );

      function serializeState() {
        return {
          rawState: {
            ...defaultControlManager.getLatestState(),
            ...selections.getLatestState(),
          },
          references: [],
        };
      }

      const unsavedChangesApi = initializeUnsavedChanges<ESQLControlState>({
        uuid,
        parentApi,
        serializeState,
        anyStateChange$: merge(defaultControlManager.anyStateChange$, selections.anyStateChange$),
        getComparators: () => {
          return {
            ...defaultControlComparators,
            ...selectionComparators,
          };
        },
        onReset: (lastSaved) => {
          defaultControlManager.reinitializeState(lastSaved?.rawState);
          selections.reinitializeState(lastSaved?.rawState);
        },
      });

      const api = finalizeApi({
        ...unsavedChangesApi,
        ...defaultControlManager.api,
        ...selections.api,
        defaultTitle$: new BehaviorSubject<string | undefined>(state.title),
        isEditingEnabled: () => true,
        getTypeDisplayName: () => displayName,
        onEdit: async () => {
          const nextState = {
            ...defaultControlManager.getLatestState(),
            ...selections.getLatestState(),
          };
          const variablesInParent = apiPublishesESQLVariables(api.parentApi)
            ? api.parentApi.esqlVariables$.value
            : [];
          const onSaveControl = async (updatedState: ESQLControlState) => {
            defaultControlManager.reinitializeState(updatedState);
            selections.reinitializeState(updatedState);
          };
          try {
            await uiActionsService.getTrigger('ESQL_CONTROL_TRIGGER').exec({
              queryString: nextState.esqlQuery,
              variableType: nextState.variableType,
              controlType: nextState.controlType,
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
        singleSelect: true,
        exclude: false,
        existsSelected: false,
        requestSize: 0,
        dataLoading: false,
        sort: undefined,
        runPastTimeout: false,
        invalidSelections: new Set<OptionsListSelection>(),
        fieldName: state.variableName,
      };
      // Generate a state manager for all the props this control isn't expected to use, so the getters and setters are available
      const componentStaticStateManager = initializeStateManager<OptionsListESQLUnusedState>(
        componentStaticState,
        componentStaticState
      );

      const componentApi: OptionsListComponentApi = {
        ...api,
        ...selections.internalApi,
        uuid,
        makeSelection(key?: string) {
          if (key) selections.internalApi.setSelectedOptions([key]);
        },
        // Pass no-ops and default values for all of the features of OptionsList that ES|QL controls don't currently use
        ...componentStaticStateManager.api,
        deselectOption: () => {},
        selectAll: () => {},
        deselectAll: () => {},
        loadMoreSubject: new BehaviorSubject<void>(undefined),
        fieldFormatter: new BehaviorSubject((v: string) => v),
        allowExpensiveQueries$: new BehaviorSubject<boolean>(true),
      };

      return {
        api: {
          ...api,
          /**
           * TODO: Remove this once duplicating ES|QL controls has been implemented
           * ES|QL controls can only output unique variable names, so in order to duplicate the control,
           * we would need to add a number or other uniquifying character to the end of the variable name.
           * The problem with this is that the user cannot edit variable names after the control is created.
           * Once we come up with a good UX solution to this, we can return duplicatePanel to the parentApi
           */
          parentApi: omit(api.parentApi, 'duplicatePanel'),
        },
        Component: () => (
          <OptionsListControlContext.Provider
            value={{
              componentApi,
              displaySettings: {
                hideActionBar: false,
                hideExclude: true,
                hideExists: true,
                hideSort: true,
              },
            }}
          >
            <OptionsListControl />
          </OptionsListControlContext.Provider>
        ),
      };
    },
  };
};
