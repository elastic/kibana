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
import { css } from '@emotion/react';
import { EuiComboBox } from '@elastic/eui';
import { apiPublishesESQLVariables, type ESQLControlState } from '@kbn/esql-types';
import { useBatchedPublishingSubjects, apiHasParentApi } from '@kbn/presentation-publishing';
import { initializeUnsavedChanges } from '@kbn/presentation-containers';
import { tracksOverlays } from '@kbn/presentation-util';
import { ESQL_CONTROL } from '../../../common';
import type { ESQLControlApi } from './types';
import { ControlFactory } from '../types';
import { uiActionsService } from '../../services/kibana_services';
import {
  defaultControlComparators,
  initializeDefaultControlManager,
} from '../default_control_manager';
import { initializeESQLControlSelections, selectionComparators } from './esql_control_selections';

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

      const inputCss = css`
        .euiComboBox__inputWrap {
          box-shadow: none;
        }
      `;
      return {
        api,
        Component: ({ className: controlPanelClassName }) => {
          const [availableOptions, selectedOptions] = useBatchedPublishingSubjects(
            selections.internalApi.availableOptions$,
            selections.internalApi.selectedOptions$
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
                  selections.internalApi.setSelectedOptions(selectedValues);
                }}
              />
            </div>
          );
        },
      };
    },
  };
};
