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
  PublishingSubject,
} from '@kbn/presentation-publishing';
import { EsqlControlType } from '@kbn/esql-validation-autocomplete';
import { esqlVariablesService } from '@kbn/esql/common';
import { ESQL_CONTROL } from '../../../common';
import type { ESQLControlState, ESQLControlApi } from './types';
import { ControlFactory } from '../types';
import { uiActionsService } from '../../services/kibana_services';
import { initializeDefaultControlApi } from '../initialize_default_control_api';
import { initializeESQLControlSelections } from './esql_control_selections';

const displayName = i18n.translate('controls.esqlValuesControl.displayName', {
  defaultMessage: 'Static values list',
});

export const getESQLControlFactory = (): ControlFactory<ESQLControlState, ESQLControlApi> => {
  return {
    type: ESQL_CONTROL,
    order: 3,
    getIconType: () => 'editorChecklist',
    getDisplayName: () => displayName,
    buildControl: async (initialState, buildApi, uuid, controlGroupApi) => {
      const selectedOptions$ = new BehaviorSubject<string[]>(initialState.selectedOptions ?? []);
      const variableName$ = new BehaviorSubject<string>(initialState.variableName ?? '');
      const variableType$ = new BehaviorSubject<EsqlControlType>(
        initialState.variableType ?? EsqlControlType.VALUES
      );
      // initialize the variable
      esqlVariablesService.addVariable({
        key: initialState.variableName,
        value: initialState.selectedOptions[0],
        type: initialState.variableType,
      });
      const hasSelections$ = new BehaviorSubject<boolean>(
        Boolean(initialState.selectedOptions?.length)
      );
      const defaultControl = initializeDefaultControlApi({ ...initialState });

      const selections = initializeESQLControlSelections(initialState);

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
          hasSelections$: hasSelections$ as PublishingSubject<boolean | undefined>,
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
