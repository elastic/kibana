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
import { BehaviorSubject } from 'rxjs';
import { EuiComboBox } from '@elastic/eui';
import {
  useBatchedPublishingSubjects,
  getUnchangingComparator,
} from '@kbn/presentation-publishing';
import { esqlVariablesService } from '@kbn/esql/common';
import { ESQL_CONTROL_STATIC_VALUES } from '../../../common';
import type { StaticValuesListControlState, StaticValuesListControlApi } from './types';
import { ControlFactory } from '../types';
import { uiActionsService } from '../../services/kibana_services';
import { initializeDefaultControlApi } from '../initialize_default_control_api';
import { initializeStaticValuesControlSelections } from './static_values_control_selections';

const displayName = i18n.translate('controls.esqlValuesControl.displayName', {
  defaultMessage: 'Static values list',
});

export const getStaticValuesListControlFactory = (): ControlFactory<
  StaticValuesListControlState,
  StaticValuesListControlApi
> => {
  return {
    type: ESQL_CONTROL_STATIC_VALUES,
    order: 3,
    getIconType: () => 'editorChecklist',
    getDisplayName: () => displayName,
    buildControl: async (initialState, buildApi, uuid, controlGroupApi) => {
      const selectedOptions$ = new BehaviorSubject<string[]>(initialState.selectedOptions ?? []);
      const variableName$ = new BehaviorSubject<string>(initialState.variableName ?? '');
      const variableType$ = new BehaviorSubject<string>(initialState.variableType ?? '');
      // initialize the variable
      esqlVariablesService.addVariable({
        key: initialState.variableName,
        value: initialState.selectedOptions[0],
        type: initialState.variableType,
      });
      const defaultControl = initializeDefaultControlApi({ ...initialState });

      const selections = initializeStaticValuesControlSelections(initialState);

      const api = buildApi(
        {
          ...defaultControl.api,
          defaultPanelTitle: new BehaviorSubject<string | undefined>(initialState.variableName),
          isEditingEnabled: () => true,
          getTypeDisplayName: () => displayName,
          onEdit: async () => {
            const state = {
              ...initialState,
              ...defaultControl.serialize().rawState,
            };
            await uiActionsService.getTrigger('ESQL_CONTROL_TRIGGER').exec({
              queryString: initialState.esqlQuery,
              controlType: initialState.variableType,
              dashboardApi: controlGroupApi.parentApi,
              panelId: uuid,
              initialState: state,
            });
          },
          selectedOptions$,
          serializeState: () => {
            const { rawState: defaultControlState } = defaultControl.serialize();
            return {
              rawState: {
                ...defaultControlState,
                selectedOptions: selections.selectedOptions$.getValue(),
                availableOptions: selections.availableOptions$.getValue(),
                variableName: selections.variableName$.getValue(),
                variableType: selections.variableType$.getValue(),
                esqlQuery: selections.esqlQuery$.getValue(),
              },
              references: [],
            };
          },
          clearSelections: () => {
            if (selections.selectedOptions$.getValue()?.length) selections.setSelectedOptions([]);
          },
          clearVariables: () => {
            esqlVariablesService.removeVariable(initialState.variableName);
          },
        },
        {
          ...defaultControl.comparators,
          width: getUnchangingComparator(),
          ...selections.comparators,
        }
      );

      return {
        api,
        Component: ({ className: controlPanelClassName }) => {
          const [availableOptions, selectedOptions, variableName, variableType] =
            useBatchedPublishingSubjects(
              selections.availableOptions$,
              selections.selectedOptions$,
              variableName$,
              variableType$
            );

          return (
            <div className={controlPanelClassName}>
              <EuiComboBox
                aria-label="Accessible screen reader label"
                placeholder="Select a single option"
                singleSelection={{ asPlainText: true }}
                options={availableOptions.map((option) => ({ label: option }))}
                selectedOptions={selectedOptions.map((option) => ({ label: option }))}
                compressed
                fullWidth
                onChange={(options) => {
                  const selectedValues = options.map((option) => option.label);
                  selections.setSelectedOptions(selectedValues);
                  // take the name from the variable name
                  esqlVariablesService.updateVariable(
                    variableName,
                    selectedValues[0],
                    variableType
                  );
                }}
              />
            </div>
          );
        },
      };
    },
  };
};
