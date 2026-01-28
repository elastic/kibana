/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Reference } from '@kbn/content-management-utils';
import { OPTIONS_LIST_CONTROL } from '@kbn/controls-constants';
import type {
  LegacyStoredOptionsListExplicitInput,
  OptionsListDSLControlState,
} from '@kbn/controls-schemas';
import type { EmbeddableSetup } from '@kbn/embeddable-plugin/server';
import { transformDataControlIn, transformDataControlOut } from './data_control_transforms';

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
          ...state,
        },
        references,
      };
    },
    transformOut: <
      StoredStateType extends Partial<
        LegacyStoredOptionsListExplicitInput & OptionsListDSLControlState
      >
    >(
      state: StoredStateType,
      panelReferences: Reference[] | undefined,
      containerReferences: Reference[] | undefined,
      id: string | undefined
    ): OptionsListDSLControlState => {
      const dataControlState = transformDataControlOut(
        id,
        state,
        OPTIONS_LIST_LEGACY_REF_NAMES,
        panelReferences,
        containerReferences
      );

      const {
        existsSelected,
        exists_selected,
        displaySettings,
        display_settings,
        runPastTimeout,
        run_past_timeout,
        searchTechnique,
        search_technique,
        selectedOptions,
        selected_options,
        singleSelect,
        single_select,
      } = state;

      return {
        ...dataControlState,
        exclude: state.exclude,
        sort: state.sort as OptionsListDSLControlState['sort'],

        /**
         * Pre 9.4 the control state was stored in camelCase; these transforms ensure they are converted to snake_case
         */
        ...(typeof existsSelected === 'boolean' && { exists_selected: existsSelected }),
        ...(typeof exists_selected === 'boolean' && { exists_selected }),
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

        ...(typeof runPastTimeout === 'boolean' && { run_past_timeout: runPastTimeout }),
        ...(typeof run_past_timeout === 'boolean' && { run_past_timeout }),
        ...(searchTechnique && {
          search_technique: searchTechnique as OptionsListDSLControlState['search_technique'],
        }),
        ...(search_technique && { search_technique }),
        ...(Array.isArray(selectedOptions) && selectedOptions.length
          ? { selected_options: selectedOptions }
          : {}),
        ...(selected_options && { selected_options }),
        ...(typeof singleSelect === 'boolean' && { single_select: singleSelect }),
        ...(typeof single_select === 'boolean' && { single_select }),
      };
    },
  });
};
