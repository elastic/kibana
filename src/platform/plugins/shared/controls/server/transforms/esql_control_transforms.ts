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
  LegacyStoredESQLControlExplicitInput,
  OptionsListESQLControlState,
} from '@kbn/controls-schemas';
import type { EmbeddableSetup } from '@kbn/embeddable-plugin/server';
import { convertCamelCasedKeysToSnakeCase } from '@kbn/presentation-publishing';

export const registerESQLControlTransforms = (embeddable: EmbeddableSetup) => {
  embeddable.registerTransforms(ESQL_CONTROL, {
    getTransforms: () => ({
      transformOut: <
        StoredStateType extends Partial<
          LegacyStoredESQLControlExplicitInput & OptionsListESQLControlState
        >
      >(
        state: StoredStateType
      ): OptionsListESQLControlState => {
        /**
         * Pre 9.4 the control state was stored in camelCase; these transforms ensure they are converted to snake_case
         */
        const {
          available_options,
          control_type,
          display_settings,
          esql_query,
          selected_options,
          single_select,
          variable_name,
          variable_type,
        } = convertCamelCasedKeysToSnakeCase<LegacyStoredESQLControlExplicitInput>(
          state as LegacyStoredESQLControlExplicitInput
        );
        return {
          available_options,
          control_type: control_type as OptionsListESQLControlState['control_type'],
          display_settings,
          esql_query: esql_query ?? '',
          selected_options: selected_options ?? [],
          single_select,
          variable_name: variable_name ?? '',
          variable_type: variable_type as OptionsListESQLControlState['variable_type'],
        };
      },
    }),
  });
};
