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
import { css } from '@emotion/react';
import { EuiComboBox } from '@elastic/eui';
import { useBatchedPublishingSubjects, PublishingSubject } from '@kbn/presentation-publishing';
import { ESQLVariableType } from '@kbn/esql-validation-autocomplete';
import { esqlVariablesService } from '@kbn/esql-variables/common';
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
      // initialize the variable
      esqlVariablesService.addVariable({
        key: initialState.variableName,
        value: initialState.selectedOptions[0],
        type: initialState.variableType,
      });
      const hasSelections$ = new BehaviorSubject<boolean>(false);
      const defaultControl = initializeDefaultControlApi({ ...initialState });

      const selections = initializeESQLControlSelections(initialState);

      const onSaveControl = (updatedState: ESQLControlState) => {
        controlGroupApi?.replacePanel(uuid, {
          panelType: 'esqlControl',
          initialState: updatedState,
        });
      };

      const api = buildApi(
        {
          ...defaultControl.api,
          defaultPanelTitle: new BehaviorSubject<string | undefined>(initialState.title),
          isEditingEnabled: () => true,
          getTypeDisplayName: () => displayName,
          onEdit: async () => {
            const state = {
              ...initialState,
              ...defaultControl.serialize().rawState,
            };
            await uiActionsService.getTrigger('ESQL_CONTROL_TRIGGER').exec({
              queryString: initialState.esqlQuery,
              variableType: initialState.variableType,
              controlType: initialState.controlType,
              onSaveControl,
              initialState: state,
            });
          },
          selectedOptions$: selections.selectedOptions$,
          serializeState: () => {
            const { rawState: defaultControlState } = defaultControl.serialize();
            return {
              rawState: {
                ...defaultControlState,
                selectedOptions: selections.selectedOptions$.getValue(),
                availableOptions: selections.availableOptions$.getValue(),
                variableName: selections.variableName$.getValue(),
                variableType: selections.variableType$.getValue(),
                controlType: selections.controlType$.getValue(),
                esqlQuery: selections.esqlQuery$.getValue(),
                title: selections.title$.getValue(),
              },
              references: [],
            };
          },
          clearSelections: () => {
            // do nothing, not allowed for now;
          },
          clearVariables: () => {
            esqlVariablesService.removeVariable(initialState.variableName);
          },
          resetVariables: () => {
            esqlVariablesService.updateVariable({
              key: selections.variableName$.getValue(),
              value: selections.selectedOptions$.getValue()[0],
              type: selections.variableType$.getValue() as ESQLVariableType,
            });
          },
          hasSelections$: hasSelections$ as PublishingSubject<boolean | undefined>,
        },
        {
          ...defaultControl.comparators,
          ...selections.comparators,
        }
      );

      const inputCss = css`
        .euiComboBox__inputWrap {
          box-shadow: none;
        }
      `;
      return {
        api,
        Component: ({ className: controlPanelClassName }) => {
          const [availableOptions, selectedOptions, variableName, variableType] =
            useBatchedPublishingSubjects(
              selections.availableOptions$,
              selections.selectedOptions$,
              selections.variableName$,
              selections.variableType$
            );

          return (
            <div className={controlPanelClassName}>
              <EuiComboBox
                aria-label={i18n.translate('controls.controlGroup.manageControl.esql.ariaLabel', {
                  defaultMessage: 'ES|QL variable control',
                })}
                placeholder={i18n.translate(
                  'controls.controlGroup.manageControl.esql.placeholder',
                  {
                    defaultMessage: 'Select a single value',
                  }
                )}
                inputPopoverProps={{
                  css: inputCss,
                  className: 'esqlControlValuesCombobox',
                }}
                data-test-subj="esqlControlValuesDropdown"
                singleSelection={{ asPlainText: true }}
                options={availableOptions.map((option) => ({ label: option }))}
                selectedOptions={selectedOptions.map((option) => ({ label: option }))}
                compressed
                fullWidth
                isClearable={false}
                onChange={(options) => {
                  const selectedValues = options.map((option) => option.label);
                  selections.setSelectedOptions(selectedValues);

                  esqlVariablesService.updateVariable({
                    key: variableName,
                    value: selectedValues[0],
                    type: variableType as ESQLVariableType,
                  });
                }}
              />
            </div>
          );
        },
      };
    },
  };
};
