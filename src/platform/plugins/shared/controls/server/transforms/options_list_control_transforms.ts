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
import { convertCamelCasedKeysToSnakeCase } from '@kbn/presentation-publishing';
import { transformDataControlIn, transformDataControlOut } from './data_control_transforms';

const OPTIONS_LIST_REF_NAME = 'optionsListDataView' as const;
const OPTIONS_LIST_LEGACY_REF_NAMES = [
  'optionsListDataView',
  'optionsListControlDataView',
] as const;

export const registerOptionsListControlTransforms = (embeddable: EmbeddableSetup) => {
  embeddable.registerTransforms(OPTIONS_LIST_CONTROL, {
    getTransforms: () => ({
      transformIn: (state: OptionsListDSLControlState) => {
        const { state: dataControlState, references } = transformDataControlIn(
          state,
          OPTIONS_LIST_REF_NAME
        );
        return {
          state: dataControlState,
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

        /**
         * Pre 9.4 the control state was stored in camelCase; these transforms ensure they are converted to snake_case
         */
        const {
          exclude,
          sort,
          exists_selected,
          display_settings,
          run_past_timeout,
          search_technique,
          selected_options,
          single_select,
        } = convertCamelCasedKeysToSnakeCase<LegacyStoredOptionsListExplicitInput>(
          state as LegacyStoredOptionsListExplicitInput
        );
        return {
          ...dataControlState,
          exclude,
          ...{ sort: sort as OptionsListDSLControlState['sort'] },
          exists_selected,
          display_settings,
          run_past_timeout,
          search_technique: search_technique as OptionsListDSLControlState['search_technique'],
          selected_options,
          single_select,
        };
      },
    }),
  });
};
