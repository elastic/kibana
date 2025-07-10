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
import { apiPublishesESQLVariables } from '@kbn/esql-types';
import { apiHasParentApi, initializeStateManager } from '@kbn/presentation-publishing';
import { initializeUnsavedChanges, tracksOverlays } from '@kbn/presentation-containers';
import { OptionsListSelection } from '../../../common/options_list';
import { ESQL_CONTROL } from '../../../common';
import type { ESQLControlApi, ESQLControlState } from './types';
import { ControlFactory } from '../types';
import { uiActionsService } from '../../services/kibana_services';
import {
  defaultControlComparators,
  initializeDefaultControlManager,
} from '../default_control_manager';
import { initializeESQLControlSelections, selectionComparators } from './esql_control_selections';
import { OptionsListControlContext } from '../data_controls/options_list_control/options_list_context_provider';
import { OptionsListControl } from '../data_controls/options_list_control/components/options_list_control';
import {
  OptionsListComponentApi,
  OptionsListESQLUnusedState,
} from '../data_controls/options_list_control/types';

const displayName = i18n.translate('controls.esqlValuesControl.displayName', {
  defaultMessage: 'Static values list',
});

export const getESQLControlFactory = (): ControlFactory<ESQLControlState, ESQLControlApi> => {
  return {
    type: ESQL_CONTROL,
    order: 3,
    getIconType: () => 'editorChecklist',
    getDisplayName: () => displayName,
    buildControl: async ({ initialState, finalizeApi, uuid, controlGroupApi }) => {
      const defaultControlManager = initializeDefaultControlManager(initialState);
      const selections = initializeESQLControlSelections(
        initialState,
        controlGroupApi.controlFetch$(uuid)
      );

      const closeOverlay = () => {
        if (apiHasParentApi(controlGroupApi) && tracksOverlays(controlGroupApi.parentApi)) {
          controlGroupApi.parentApi.clearOverlays();
        }
      };
      const onSaveControl = (updatedState: ESQLControlState) => {
        controlGroupApi?.replacePanel(uuid, {
          panelType: 'esqlControl',
          serializedState: {
            rawState: updatedState,
          },
        });
        closeOverlay();
      };

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
        parentApi: controlGroupApi,
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
        defaultTitle$: new BehaviorSubject<string | undefined>(initialState.title),
        isEditingEnabled: () => true,
        getTypeDisplayName: () => displayName,
        onEdit: async () => {
          const state = {
            ...initialState,
            ...defaultControlManager.getLatestState(),
          };
          const variablesInParent = apiPublishesESQLVariables(api.parentApi)
            ? api.parentApi.esqlVariables$.value
            : [];
          try {
            await uiActionsService.getTrigger('ESQL_CONTROL_TRIGGER').exec({
              queryString: initialState.esqlQuery,
              variableType: initialState.variableType,
              controlType: initialState.controlType,
              esqlVariables: variablesInParent,
              onSaveControl,
              onCancelControl: closeOverlay,
              initialState: state,
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
        fieldName: initialState.variableName,
      };
      // Generate a state manager for all the props this control isn't expected to use, so the getters and setters are available
      const componentStaticStateManager = initializeStateManager<OptionsListESQLUnusedState>(
        componentStaticState,
        componentStaticState
      );

      const componentApi: OptionsListComponentApi = {
        ...selections.internalApi,
        uuid,
        makeSelection(key?: string) {
          if (key) selections.internalApi.setSelectedOptions([key]);
        },
        allowExpensiveQueries$: api.parentApi.allowExpensiveQueries$,
        defaultTitle$: api.defaultTitle$,
        // Pass no-ops and default values for all of the features of OptionsList that ES|QL controls don't currently use
        ...componentStaticStateManager.api,
        deselectOption: () => {},
        selectAll: () => {},
        deselectAll: () => {},
        loadMoreSubject: new BehaviorSubject<void>(undefined),
      };

      return {
        api,
        Component: ({ className: controlPanelClassName }) => (
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
            <OptionsListControl controlPanelClassName={controlPanelClassName} />
          </OptionsListControlContext.Provider>
        ),
      };
    },
  };
};
