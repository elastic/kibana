/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { DEFAULT_ESQL_OPTIONS_LIST_STATE, ESQL_CONTROL } from '@kbn/controls-constants';
import {
  type LegacyStoredESQLControlExplicitInput,
  type OptionsListESQLControlState,
  optionsListESQLControlSchema,
} from '@kbn/controls-schemas';
import type { EmbeddableSetup } from '@kbn/embeddable-plugin/server';
import { convertCamelCasedKeysToSnakeCase } from '@kbn/presentation-publishing';
import { EsqlControlType } from '@kbn/esql-types';

export const registerESQLControlTransforms = (embeddable: EmbeddableSetup) => {
  embeddable.registerEmbeddableServerDefinition(ESQL_CONTROL, {
    title: 'ES|QL variable control',
    getSchema: () => optionsListESQLControlSchema,
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
          title,
          variable_name,
          variable_type,
        } = convertCamelCasedKeysToSnakeCase<LegacyStoredESQLControlExplicitInput>(
          state as LegacyStoredESQLControlExplicitInput
        );

        const shared = {
          control_type: control_type as OptionsListESQLControlState['control_type'],
          display_settings,
          selected_options: selected_options ?? DEFAULT_ESQL_OPTIONS_LIST_STATE.selected_options,
          single_select: single_select ?? DEFAULT_ESQL_OPTIONS_LIST_STATE.single_select,
          variable_name: variable_name ?? '',
          variable_type: variable_type as OptionsListESQLControlState['variable_type'],
          ...(title && { title }),
        };
        return control_type === EsqlControlType.STATIC_VALUES
          ? {
              ...shared,
              control_type: EsqlControlType.STATIC_VALUES,
              available_options: available_options ?? [],
            }
          : {
              ...shared,
              control_type: EsqlControlType.VALUES_FROM_QUERY,
              esql_query: esql_query ?? '',
            };
      },
    }),
  });
};
