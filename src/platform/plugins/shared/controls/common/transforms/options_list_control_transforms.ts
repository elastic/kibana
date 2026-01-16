/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { OPTIONS_LIST_CONTROL } from '@kbn/controls-constants';
import type {
  OptionsListDSLControlState,
  StoredOptionsListExplicitInput,
} from '@kbn/controls-schemas';
import type { EmbeddableSetup } from '@kbn/embeddable-plugin/server';
import { transformDataControlOut, transformDataControlIn } from './data_control_transforms';

const OPTIONS_LIST_REF_NAME = 'optionsListDataView' as const;
const OPTIONS_LIST_LEGACY_REF_NAMES = [
  'optionsListDataView',
  'optionsListControlDataView',
] as const;

export const registerOptionsListControlTransforms = (embeddable: EmbeddableSetup) => {
  embeddable.registerTransforms(OPTIONS_LIST_CONTROL, {
    transformIn: (state: OptionsListDSLControlState) => {
      const { state: dataControlState, references } = transformDataControlIn(
        state,
        OPTIONS_LIST_REF_NAME
      );
      return {
        state: {
          ...dataControlState,
          exclude: state.exclude,
          existsSelected: state.exists_selected,
          displaySettings: {
            hideActionBar: state.display_settings?.hide_action_bar,
            hideExclude: state.display_settings?.hide_exclude,
            hideExists: state.display_settings?.hide_exists,
            hideSort: state.display_settings?.hide_sort,
            placeholder: state.display_settings?.placeholder,
          },
          runPastTimeout: state.run_past_timeout,
          searchTechnique: state.search_technique,
          selectedOptions: state.selected_options,
          singleSelect: state.single_select,
          sort: state.sort,
        } as StoredOptionsListExplicitInput,
        references,
      };
    },
    transformOut: (
      state: StoredOptionsListExplicitInput,
      panelReferences,
      containerReferences,
      id
    ): OptionsListDSLControlState => {
      const dataControlState = transformDataControlOut(
        id,
        state,
        OPTIONS_LIST_LEGACY_REF_NAMES,
        panelReferences,
        containerReferences
      );
      return {
        ...dataControlState,
        exclude: state.exclude,
        exists_selected: state.existsSelected,
        display_settings: {
          hide_action_bar: state.displaySettings?.hideActionBar,
          hide_exclude: state.displaySettings?.hideExclude,
          hide_exists: state.displaySettings?.hideExists,
          hide_sort: state.displaySettings?.hideSort,
          placeholder: state.displaySettings?.placeholder,
        },
        run_past_timeout: state.runPastTimeout,
        search_technique: state.searchTechnique as OptionsListDSLControlState['search_technique'],
        selected_options: state.selectedOptions,
        single_select: state.singleSelect,
        sort: state.sort as OptionsListDSLControlState['sort'],
      };
    },
  });
};
