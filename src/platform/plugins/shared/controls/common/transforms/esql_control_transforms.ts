/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ESQL_CONTROL } from '@kbn/controls-constants';
import type { OptionsListESQLControlState } from '@kbn/controls-schemas';
import type { EmbeddableSetup } from '@kbn/embeddable-plugin/server';

interface LegacyStoredESQLControlExplicitInput {
  availableOptions?: string[];
  controlType: string;
  displaySettings?: {
    placeholder?: string;
    hideActionBar?: boolean;
    hideExclude?: boolean;
    hideExists?: boolean;
    hideSort?: boolean;
  };
  esqlQuery: string;
  selectedOptions?: string[];
  singleSelect?: boolean;
  variableName: string;
  variableType: string;
}

export const registerESQLControlTransforms = (embeddable: EmbeddableSetup) => {
  embeddable.registerTransforms(ESQL_CONTROL, {
    transformOut: <
      StoredStateType extends Partial<
        LegacyStoredESQLControlExplicitInput & OptionsListESQLControlState
      >
    >(
      state: StoredStateType
    ): OptionsListESQLControlState => {
      const {
        availableOptions,
        available_options,
        controlType,
        control_type,
        displaySettings,
        display_settings,
        esqlQuery,
        esql_query,
        selectedOptions,
        selected_options,
        singleSelect,
        single_select,
        variableName,
        variable_name,
        variableType,
        variable_type,
      } = state;

      return {
        /**
         * Pre 9.4 the control state was stored in camelCase; these transforms ensure they are converted to snake_case
         */
        ...(Array.isArray(availableOptions) && availableOptions.length
          ? { available_options: availableOptions }
          : {}),
        ...(available_options && { available_options }),
        ...(controlType && { control_type: controlType }),
        ...(control_type ? { control_type } : { control_type: '' }),
        ...(displaySettings
          ? {
              display_settings: {
                ...(typeof displaySettings.hideActionBar === 'boolean' && {
                  hide_action_bar: displaySettings.hideActionBar,
                }),
                ...(typeof displaySettings.hideExclude === 'boolean' && {
                  hide_exclude: displaySettings.hideExclude,
                }),
                ...(typeof displaySettings.hideExists === 'boolean' && {
                  hide_exists: displaySettings.hideExists,
                }),
                ...(typeof displaySettings.hideSort === 'boolean' && {
                  hide_sort: displaySettings.hideSort,
                }),
                ...(displaySettings.placeholder && {
                  placeholder: displaySettings.placeholder,
                }),
              },
            }
          : {}),
        ...(display_settings ? { display_settings } : {}),
        ...(esqlQuery && { esql_query: esqlQuery }),
        ...(esql_query && { esql_query }),

        ...(Array.isArray(selectedOptions) && selectedOptions.length
          ? { selected_options: selectedOptions }
          : {}),
        ...(selected_options && { selected_options }),

        ...(typeof singleSelect === 'boolean' && { single_select: singleSelect }),
        ...(typeof single_select === 'boolean' && { single_select }),

        ...(variableName && { variable_name: variableName }),
        ...(variable_name && { variable_name }),
        ...(variableType && { variable_type: variableType }),
        ...(variable_type && { variable_type }),
      };
    },
  });
};
