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
import { apiPublishesESQLVariables } from '@kbn/esql-variables-types';
import { useBatchedPublishingSubjects, apiHasParentApi } from '@kbn/presentation-publishing';
import { tracksOverlays } from '@kbn/presentation-containers';
import type { ESQLControlState } from '@kbn/esql/public';
import { ESQL_CONTROL } from '../../../common';
import type { ESQLControlApi } from './types';
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
      const defaultControl = initializeDefaultControlApi(initialState);
      const selections = initializeESQLControlSelections(initialState);

      const closeOverlay = () => {
        if (apiHasParentApi(controlGroupApi) && tracksOverlays(controlGroupApi.parentApi)) {
          controlGroupApi.parentApi.clearOverlays();
        }
      };
      const onSaveControl = (updatedState: ESQLControlState) => {
        controlGroupApi?.replacePanel(uuid, {
          panelType: 'esqlControl',
          initialState: updatedState,
        });
        closeOverlay();
      };

      const api = buildApi(
        {
          ...defaultControl.api,
          ...selections.api,
          defaultTitle$: new BehaviorSubject<string | undefined>(initialState.title),
          isEditingEnabled: () => true,
          getTypeDisplayName: () => displayName,
          onEdit: async () => {
            const state = {
              ...initialState,
              ...defaultControl.serialize().rawState,
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
          const [availableOptions, selectedOptions] = useBatchedPublishingSubjects(
            selections.availableOptions$,
            selections.selectedOptions$
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
                }}
              />
            </div>
          );
        },
      };
    },
  };
};
