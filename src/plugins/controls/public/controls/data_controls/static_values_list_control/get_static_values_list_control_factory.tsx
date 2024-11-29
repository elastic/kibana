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
import { EuiComboBox } from '@elastic/eui';
import { useBatchedPublishingSubjects } from '@kbn/presentation-publishing';
import { esqlVariablesService } from '@kbn/esql/common';
import { ESQL_CONTROL_STATIC_VALUES } from '../../../../common';
import type { StaticValuesListControlState, StaticValuesListControlApi } from './types';
import { initializeDataControl } from '../initialize_data_control';
import type { DataControlFactory } from '../types';
import { initializeStaticValuesControlSelections } from './static_values_control_selections';

export const getStaticValuesListControlFactory = (): DataControlFactory<
  StaticValuesListControlState,
  StaticValuesListControlApi
> => {
  return {
    type: ESQL_CONTROL_STATIC_VALUES,
    order: 3,
    getIconType: () => 'editorChecklist',
    getDisplayName: () => 'Static values list',
    isFieldCompatible: () => false,
    CustomOptionsComponent: undefined,
    buildControl: async (initialState, buildApi, uuid, controlGroupApi) => {
      const availableOptions$ = new BehaviorSubject<string[]>(initialState.availableOptions ?? []);
      const selectedOptions$ = new BehaviorSubject<string[]>(initialState.selectedOptions ?? []);
      const variableName$ = new BehaviorSubject<string>(initialState.variableName ?? '');
      const variableType$ = new BehaviorSubject<string>(initialState.variableType ?? '');
      // initialize the interval variable
      esqlVariablesService.addVariable({
        key: initialState.variableName,
        value: initialState.selectedOptions[0],
        type: initialState.variableType,
      });
      const dataLoading$ = new BehaviorSubject<boolean | undefined>(undefined);

      const dataControl = initializeDataControl<
        Pick<StaticValuesListControlState, 'selectedOptions' | 'availableOptions'>
      >(
        uuid,
        ESQL_CONTROL_STATIC_VALUES,
        'optionsListDataView',
        initialState,
        {
          selectedOptions: selectedOptions$,
          availableOptions: availableOptions$,
        },
        controlGroupApi
      );

      const selections = initializeStaticValuesControlSelections(
        initialState,
        dataControl.setters.onSelectionChange
      );

      const api = buildApi(
        {
          ...dataControl.api,
          blockingError: new BehaviorSubject<Error | undefined>(undefined),
          dataLoading: dataLoading$,
          getTypeDisplayName: () => 'Static values list',
          serializeState: () => {
            const { rawState: dataControlState, references } = dataControl.serialize();
            return {
              rawState: {
                ...dataControlState,
                selectedOptions: selections.selectedOptions$.getValue(),
              },
              references, // does not have any references other than those provided by the data control serializer
            };
          },
          clearSelections: () => {
            if (selections.selectedOptions$.getValue()?.length) selections.setSelectedOptions([]);
          },
        },
        {
          ...dataControl.comparators,
          ...selections.comparators,
        }
      );

      return {
        api,
        Component: ({ className: controlPanelClassName }) => {
          // /** Get display settings - if these are ever made editable, should be part of stateManager instead */
          const [availableOptions, selectedOptions, variableName, variableType] =
            useBatchedPublishingSubjects(
              availableOptions$,
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
