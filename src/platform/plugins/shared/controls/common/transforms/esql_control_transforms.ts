/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ESQL_CONTROL } from '@kbn/controls-constants';
import type {
  OptionsListESQLControlState,
  StoredESQLControlExplicitInput,
} from '@kbn/controls-schemas';
import type { EmbeddableSetup } from '@kbn/embeddable-plugin/server';

export const registerESQLControlTransforms = (embeddable: EmbeddableSetup) => {
  embeddable.registerTransforms(ESQL_CONTROL, {
    transformIn: (state: OptionsListESQLControlState) => {
      return {
        state: {
          availableOptions: state.available_options,
          controlType: state.control_type,
          description: state.description,
          displaySettings: {
            hideActionBar: state.display_settings?.hide_action_bar,
            hideExclude: state.display_settings?.hide_exclude,
            hideExists: state.display_settings?.hide_exists,
            hideSort: state.display_settings?.hide_sort,
            placeholder: state.display_settings?.placeholder,
          },
          esqlQuery: state.esql_query,
          selectedOptions: state.selected_options,
          singleSelect: state.single_select,
          title: state.title,
          variableName: state.variable_name,
          variableType: state.variable_type,
        } as StoredESQLControlExplicitInput,
        references: [],
      };
    },
    transformOut: (
      state: StoredESQLControlExplicitInput,
      panelReferences,
      containerReferences,
      id
    ): OptionsListESQLControlState => {
      return {
        available_options: state.availableOptions,
        control_type: state.controlType as OptionsListESQLControlState['control_type'],
        esql_query: state.esqlQuery,
        display_settings: {
          hide_action_bar: state.displaySettings?.hideActionBar,
          hide_exclude: state.displaySettings?.hideExclude,
          hide_exists: state.displaySettings?.hideExists,
          hide_sort: state.displaySettings?.hideSort,
          placeholder: state.displaySettings?.placeholder,
        },
        selected_options: state.selectedOptions,
        single_select: state.singleSelect,
        variable_name: state.variableName,
        variable_type: state.variableType as OptionsListESQLControlState['variable_type'],
      };
    },
  });
};
